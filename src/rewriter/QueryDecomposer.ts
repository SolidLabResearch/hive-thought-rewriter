import { ParsedQuery, RSPQLParser } from "../parser/RSPQLParser"

export class QueryDecomposer {

    private parser: RSPQLParser
    constructor() {
        this.parser = new RSPQLParser()
    }

    decompose(query: string) {
        const originalQuery = this.parser.parse(query);


    }

}