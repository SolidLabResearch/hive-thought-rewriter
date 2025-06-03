import { ParsedQuery, RSPQLParser, WindowDefinition } from "../parser/RSPQLParser";

export class QueryCombiner {
    private queries: string[];
    private parser: RSPQLParser;

    constructor() {
        this.queries = [];
        this.parser = new RSPQLParser();
    }

    addQuery(query: string) {
        this.queries.push(query);
    }

    combine(): ParsedQuery {
        const parsedQueries: ParsedQuery[] = this.queries.map(query => this.parser.parse(query));
        const combinedQuery = new ParsedQuery();

        // Use metadata from the first query
        combinedQuery.set_r2s(parsedQueries[0].r2s);
        parsedQueries.forEach(query => {
            query.prefixes.forEach((iri, prefix) => combinedQuery.prefixes.set(prefix, iri));
        });

        parsedQueries.forEach(query => {
            query.s2r.forEach(window => {
                combinedQuery.add_s2r(window);
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

        const extractSubject = (sparql: string): string | null => {
            const match = sparql.match(/\{\s*GRAPH\s+[^}]*\{\s*(\?[a-zA-Z0-9_]+)/);
            return match ? match[1] : null;
        };

        const baseSubject = extractSubject(parsedQueries[0].sparql);
        const allSameSubject = parsedQueries.every(q => extractSubject(q.sparql) === baseSubject);

        let combinedWhere = "";

        if (allSameWindow && allSameSubject) {
            // JOIN logic
            const windowName = parsedQueries[0].s2r[0].window_name;
            const shortenedWindow = this.shortenIri(windowName, combinedQuery.prefixes);

            const patterns = parsedQueries.map(q => {
                const match = q.sparql.match(/GRAPH\s+[^}]+\{\s*((.|\s)*?)\}/m);
                return match ? match[1].trim() : "";
            });

            combinedWhere = `{ WINDOW ${shortenedWindow} {\n${patterns.join("\n")}\n} }`;
        } else {
            // UNION logic
            const blocks = parsedQueries.map(q => {
                let body = q.sparql;
                body = body.replace(/GRAPH\s+/gi, "WINDOW ");
                const inner = body.split("WHERE")[1].trim();
                return `{ ${inner} }`;
            });

            combinedWhere = blocks.join("\nUNION\n");
        }

        const projectionString = combinedQuery.aggregation_function && combinedQuery.aggregation_thing_in_context.length
            ? combinedQuery.aggregation_thing_in_context.map((v, i) => {
                const alias = combinedQuery.projection_variables[i] || `agg_${i}`;
                return `(${combinedQuery.aggregation_function}(?${v}) AS ?${alias})`;
            }).join(" ")
            : combinedQuery.projection_variables.map(v => `?${v}`).join(" ");

        combinedQuery.set_sparql(`SELECT ${projectionString} WHERE ${combinedWhere}`);

        return combinedQuery;
    }



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

    let whereBody = match[1].trim();

    // 7. Handle UNION blocks
    const unionBlocks = whereBody
        .split(/UNION/i)
        .map(block => {
            // Remove all leading/trailing curly braces and whitespace
            const trimmed = block.trim().replace(/^\{+/, '').replace(/\}+$/, '').trim();
            return `{ ${trimmed} }`;
        });

    lines.push(unionBlocks.join(" UNION "));

    // 8. Close WHERE clause
    lines.push("}");

    return lines.join("\n");
}



    shortenIri(iri: string, prefixes: Map<string, string>): string {
        for (const [prefix, ns] of prefixes.entries()) {
            if (iri.startsWith(ns)) {
                return `${prefix}:${iri.slice(ns.length)}`;
            }
        }
        return `<${iri}>`; // fallback to full IRI
    }
}