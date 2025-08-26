/**
 * The class is responsible to rewrite the RSPQL query with new window parameters i.e. the window width and the slide.
 */
export class RewriteChunkQuery {

    public new_slide: number;
    public new_width: number;

    /**
     * The constructor for the RewriteChunkQuery class.
     * @param {number} new_slide - The new slide value for the query.
     * @param {number} new_width - The new width value for the query.
     */
    constructor(new_slide: number, new_width: number) {
        this.new_slide = new_slide;
        this.new_width = new_width;
    }
    /**
     * Rewrites the query to use the new chunk size for the RSPQL query.
     * This method modifies the query to reflect the new slide and width values.
     * @param {string} query - The original RSPQL query string to be rewritten.
     * @returns {string} - The rewritten RSPQL query string with the new chunk size applied.
     * @memberof RewriteChunkQuery 
     */
    public rewriteQueryWithNewChunkSize(query: string): string {
        // Replace the slide and width values in the query
        const newQuery = query.replace(/STEP\s+\d+/, `STEP ${this.new_slide}`)
            .replace(/RANGE\s+\d+/, `RANGE ${this.new_width}`);
        return newQuery;
    }
}