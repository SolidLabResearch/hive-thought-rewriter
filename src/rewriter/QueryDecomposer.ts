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
    decompose(query: string) {
        const originalQuery = this.parser.parse(query);
    }

}