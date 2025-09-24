import { ParsedQuery, RSPQLParser } from "../parser/RSPQLParser"

/**
 *
 */
export class QueryDecomposer {

    private parser: RSPQLParser
    /**
     *
     */
    constructor() {
        this.parser = new RSPQLParser()
    }

    /**
     *
     * @param query
     */
    decompose(query: string): ParsedQuery {
        const originalQuery = this.parser.parse(query);
        return originalQuery;
    }

}