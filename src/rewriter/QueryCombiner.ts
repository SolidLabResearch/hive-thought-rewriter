import { ParsedQuery, RSPQLParser, WindowDefinition } from "../parser/RSPQLParser";

/**
 * The class is responsible for combining RSP-QL queries into a single query.
 */
export class QueryCombiner {
    private queries: string[];
    private parser: RSPQLParser;

    /**
     * The constructor for the QueryCombiner class which initializes the RSPQL parser and the query list.
     */
    constructor() {
        this.queries = [];
        this.parser = new RSPQLParser();
    }

    /**
     * Adds a new query to the combiner.
     * @param {string} query - The query to add.
     */
    addQuery(query: string) {
        this.queries.push(query);
    }

    /**
     * Clears all queries from the combiner.
     */
    clearQueries() {
        this.queries = [];
    }

    /**
     * Combines the queries into a single query.
     */
    combineQueries(){
        if (this.queries.length === 0){
            throw new Error("No queries to combine");
        } else {
            const parsedQueries: ParsedQuery[] = this.queries.map(queryn => this.parser.parse(queryn));
            const combinedQuery = new ParsedQuery();

            combinedQuery.set_r2s(parsedQueries[0].r2s);
            

        }
    }

    /**
     * Combines the parsed queries into a single query with either a strict subject match or a loose subject match.
     * With a strict subject match, it would only combine with a JOIN if all of the subjects are the same.
     * With a loose subject match, it would combine with a JOIN if any of the subjects are the same.
     * @param {boolean} strictSubjectMatch - Boolean indicating if strict subject matching should be used or not. True for strict, false for loose.
     */
    combine(strictSubjectMatch: boolean = true): ParsedQuery {
        const parsedQueries: ParsedQuery[] = this.queries.map(query => this.parser.parse(query));
        const combinedQuery = new ParsedQuery();

        // Use metadata from the first query
        combinedQuery.set_r2s(parsedQueries[0].r2s);
        parsedQueries.forEach(query => {
            query.prefixes.forEach((iri, prefix) => combinedQuery.prefixes.set(prefix, iri));
        });

        // Deduplicate window definitions before adding to combinedQuery
        const windowSet = new Set<string>();
        parsedQueries.forEach(query => {
            query.s2r.forEach(window => {
                const key = `${window.window_name}|${window.stream_name}|${window.width}|${window.slide}`;
                if (!windowSet.has(key)) {
                    windowSet.add(key);
                    combinedQuery.add_s2r(window);
                }
            });
        });

        // Projection & aggregation merge
        parsedQueries.forEach(query => {
            query.projection_variables.forEach(varName => {
                if (!combinedQuery.projection_variables.includes(varName)) {
                    combinedQuery.projection_variables.push(varName);
                }
            });
        });

        const allAggregations = new Set(parsedQueries.map(q => q.aggregation_function).filter(Boolean));
        if (allAggregations.size === 1) {
            combinedQuery.aggregation_function = [...allAggregations][0];
            parsedQueries.forEach(query => {
                query.aggregation_thing_in_context.forEach(varName => {
                    if (!combinedQuery.aggregation_thing_in_context.includes(varName)) {
                        combinedQuery.aggregation_thing_in_context.push(varName);
                    }
                });
            });
        }

        // Determine if we should JOIN or UNION
        const sameWindowDef = (a: WindowDefinition, b: WindowDefinition) =>
            a.window_name === b.window_name &&
            a.stream_name === b.stream_name &&
            a.width === b.width &&
            a.slide === b.slide;

        const allSameWindow = parsedQueries.every(
            q => q.s2r.length === 1 && sameWindowDef(q.s2r[0], parsedQueries[0].s2r[0])
        );

        // Improved subject extraction: collect all subjects in each query
        const extractSubjects = (sparql: string): Set<string> => {
            const matches = [...sparql.matchAll(/\{\s*GRAPH\s+[^}]*\{\s*(\?[a-zA-Z0-9_]+)/g)];
            return new Set(matches.map(m => m[1]));
        };
        const baseSubjects = extractSubjects(parsedQueries[0].sparql);
        let allSameSubjects: boolean;
        if (strictSubjectMatch) {
            // Strict: all subject sets must be exactly equal
            const setsEqual = (a: Set<string>, b: Set<string>) =>
                a.size === b.size && [...a].every(x => b.has(x));
            allSameSubjects = parsedQueries.every(q => {
                const subjects = extractSubjects(q.sparql);
                return setsEqual(subjects, baseSubjects);
            });
        } else {
            // Partial: at least one subject overlaps
            const hasOverlap = (a: Set<string>, b: Set<string>) =>
                [...a].some(x => b.has(x));
            allSameSubjects = parsedQueries.every(q => {
                const subjects = extractSubjects(q.sparql);
                return hasOverlap(subjects, baseSubjects);
            });
        }

        let combinedWhere = "";

        if (allSameWindow && allSameSubjects) {
            // JOIN logic
            const windowName = parsedQueries[0].s2r[0].window_name;
            const shortenedWindow = this.shortenIri(windowName, combinedQuery.prefixes);
            const patterns = parsedQueries.map(q => {
                const match = q.sparql.match(/GRAPH\s+[^}]+\{\s*((.|\s)*?)\}/m);
                return match ? match[1].trim() : "";
            });
            combinedWhere = `WINDOW ${shortenedWindow} {\n${patterns.join("\n")}\n}`;
        } else if (allSameWindow) {
            // UNION inside a single WINDOW block, no extra curly braces
            const windowName = parsedQueries[0].s2r[0].window_name;
            const shortenedWindow = this.shortenIri(windowName, combinedQuery.prefixes);
            const blocks = parsedQueries.map(q => {
                let body = q.sparql;
                body = body.replace(/GRAPH\s+/gi, "WINDOW ");
                const match = body.match(/WHERE\s*{([\s\S]*)}$/i);
                if (!match) {
                    throw new Error("Invalid SPARQL content: missing WHERE clause");
                }
                const inner = match[1].trim();
                // Extract just the window block contents
                const windowMatch = inner.match(/WINDOW\s+[^{]+\{([^}]+)\}/);
                if (!windowMatch) {
                    throw new Error("Invalid SPARQL content: missing WINDOW block");
                }
                const windowContent = windowMatch[1].trim();
                return `{ ${windowContent} }`;
            });
            combinedWhere = `WINDOW ${shortenedWindow} {\n${blocks.join("\nUNION\n")}\n}`;
        } else {
            // UNION logic (different windows)
            const blocks = parsedQueries.map(q => {
                let body = q.sparql;
                body = body.replace(/GRAPH\s+/gi, "WINDOW ");
                const match = body.match(/WHERE\s*{([\s\S]*)}$/i);
                if (!match) {
                    throw new Error("Invalid SPARQL content: missing WHERE clause");
                }
                const inner = match[1].trim();
                // Extract just the window block contents
                const windowMatch = inner.match(/WINDOW\s+[^{]+\{([^}]+)\}/);
                if (!windowMatch) {
                    throw new Error("Invalid SPARQL content: missing WINDOW block");
                }
                const windowContent = windowMatch[1].trim();
                // Format with proper nesting
                const windowNameMatch = windowMatch[0].match(/WINDOW\s+([^{\s]+)/);
                if (!windowNameMatch) {
                    throw new Error("Invalid SPARQL content: missing WINDOW name");
                }
                const windowName = windowNameMatch[1];
                return `{ WINDOW ${windowName} { ${windowContent} } }`;
            });
            combinedWhere = `{ ${blocks.join("\nUNION\n")} }`;
        }

        const projectionString = combinedQuery.aggregation_function && combinedQuery.aggregation_thing_in_context.length
            ? combinedQuery.aggregation_thing_in_context.map((v, i) => {
                const alias = combinedQuery.projection_variables[i] || `agg_${i}`;
                return `(${combinedQuery.aggregation_function}(?${v}) AS ?${alias})`;
            }).join(" ")
            : combinedQuery.projection_variables.map(v => `?${v}`).join(" ");

        // Always wrap the combinedWhere in a WHERE clause
        combinedQuery.set_sparql(`SELECT ${projectionString} WHERE {\n${combinedWhere}\n}`);

        return combinedQuery;
    }



    /**
     * The function converts a parsed representation of a SPARQL query into a string.
     * @param {ParsedQuery} parsedQuery - The parsed representation of the SPARQL query.
     * @returns {string} - The string representation of the SPARQL query.
     */
    ParsedToString(parsedQuery: ParsedQuery): string {
        const lines: string[] = [];

        // 1. PREFIX declarations
        for (const [prefix, iri] of parsedQuery.prefixes.entries()) {
            lines.push(`PREFIX ${prefix}: <${iri}>`);
        }

        // 2. REGISTER clause
        const { operator, name } = parsedQuery.r2s;
        lines.push(`REGISTER ${operator} <${name}> AS`);

        // 3. SELECT clause
        let selectClause = "SELECT";
        const hasAgg =
            parsedQuery.aggregation_function &&
            parsedQuery.aggregation_function !== "" &&
            parsedQuery.aggregation_thing_in_context.length === parsedQuery.projection_variables.length;
        if (hasAgg) {
            const func = parsedQuery.aggregation_function.toUpperCase();
            for (let i = 0; i < parsedQuery.aggregation_thing_in_context.length; i++) {
                const varName = parsedQuery.aggregation_thing_in_context[i];
                const alias = parsedQuery.projection_variables[i] || `agg_${i}`;
                selectClause += ` (${func}(?${varName}) AS ?${alias})`;
            }
        } else {
            selectClause += " " + parsedQuery.projection_variables.map(v => `?${v}`).join(" ");
        }
        lines.push(selectClause);

        // 4. FROM NAMED WINDOW declarations
        for (const window of parsedQuery.s2r) {
            const { window_name, stream_name, width, slide } = window;
            const w = this.shortenIri(window_name, parsedQuery.prefixes);
            const s = this.shortenIri(stream_name, parsedQuery.prefixes);
            lines.push(`FROM NAMED WINDOW ${w} ON STREAM ${s} [RANGE ${width} STEP ${slide}]`);
        }

        // 5. WHERE clause
        lines.push(`WHERE {`);

        // 6. Extract and sanitize WHERE clause
        let whereClause = parsedQuery.sparql;

        // Replace GRAPH with WINDOW
        whereClause = whereClause.replace(/GRAPH\s+/gi, "WINDOW ");

        // Extract WHERE body content
        const match = whereClause.match(/WHERE\s*{([\s\S]*)}$/i);
        if (!match) {
            throw new Error("Invalid SPARQL content: missing WHERE clause");
        }

        const whereBody = match[1].trim();

        // If the WHERE body starts with a single WINDOW block, print it directly (no extra curly braces)
        const windowBlockMatch = whereBody.match(/^WINDOW\s+[^\{]+\{[\s\S]*\}$/);
        if (windowBlockMatch) {
            lines.push(whereBody);
        } else {
            // Otherwise, preserve the old logic (for legacy/multi-window cases)
            const unionBlocks = whereBody
                .split(/UNION/i)
                .map(block => {
                    // Remove all leading/trailing curly braces and whitespace
                    const trimmed = block.trim().replace(/^{+/, '').replace(/}+$/, '').trim();
                    return `{ ${trimmed} }`;
                });
            lines.push(unionBlocks.join(" UNION "));
        }

        // 8. Close WHERE clause
        lines.push("}");

        return lines.join("\n");
    }



    /**
     * Shortens an IRI using the provided prefixes.
     * @param {string} iri - The IRI to shorten.
     * @param {Map<string, string>} prefixes - A map of prefix strings to namespace IRIs.
     * @return {string} - The shortened IRI, or the full IRI if no prefix matches.
     */
    shortenIri(iri: string, prefixes: Map<string, string>): string {
        for (const [prefix, ns] of prefixes.entries()) {
            if (iri.startsWith(ns)) {
                return `${prefix}:${iri.slice(ns.length)}`;
            }
        }
        return `<${iri}>`; // fallback to full IRI
    }
}