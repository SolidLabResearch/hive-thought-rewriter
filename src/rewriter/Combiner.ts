import { QueryRelationClassifier } from "../services/QueryRelationClassifier";

/**
 *
 */
export class Combiner {
    private queryOne: string;
    private queryTwo: string;

    /**
     *
     * @param queryOne
     * @param queryTwo
     */
    constructor(queryOne: string, queryTwo: string){
        this.queryOne = queryOne;
        this.queryTwo = queryTwo;
    }

    /**
     *
     */
    combineQueries(): string {
        const classifier = new QueryRelationClassifier(this.queryOne, this.queryTwo);
        const relation = classifier.decideRelation(this.queryOne, this.queryTwo);
        console.log(relation);
        
        return '';
    }

}