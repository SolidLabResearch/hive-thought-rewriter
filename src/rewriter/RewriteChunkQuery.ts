export class RewriteChunkQuery {

    public new_slide: number;
    public new_width: number;

    constructor(new_slide: number, new_width: number) {
        this.new_slide = new_slide;
        this.new_width = new_width;
    }
    /**
     * Rewrites the query to use the new chunk size for the RSPQL query.
     * This method modifies the query to reflect the new slide and width values.
     * @param {string} query - The original RSPQL query string to be rewritten.
     * @return {string} - The rewritten RSPQL query string with the new chunk size applied.
     * @memberof RewriteChunkQuery 
     */
    public rewriteQueryWithNewChunkSize(query: string): string {
        // Replace the slide and width values in the query
        const newQuery = query.replace(/STEP\s+\d+/, `STEP ${this.new_slide}`)
            .replace(/RANGE\s+\d+/, `RANGE ${this.new_width}`);
        return newQuery;
    }
}