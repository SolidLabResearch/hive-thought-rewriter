import { QueryRelationClassifier } from "../services/QueryRelationClassifier";

const sparqlParser = require('sparqljs').Parser;
const SPARQLParser = new sparqlParser();

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

        const parsedQueryOne = SPARQLParser.parse(this.queryOne);
        const parsedQueryTwo = SPARQLParser.parse(this.queryTwo);

        let combinedQuery: any;

        switch (relation) {
            case "JOIN":
                combinedQuery = this.combineWithJoin(parsedQueryOne, parsedQueryTwo);
                break;
            case "UNION":
                combinedQuery = this.combineWithUnion(parsedQueryOne, parsedQueryTwo);
                break;
            case "CARTESIAN":
                combinedQuery = this.combineWithCartesian(parsedQueryOne, parsedQueryTwo);
                break;
            default:
                throw new Error(`Unknown relation type: ${relation}`);
        }

        const generator = require('sparqljs').Generator;
        const SPARQLGenerator = new generator();
        return SPARQLGenerator.stringify(combinedQuery);
    }

    private combineWithJoin(queryOne: any, queryTwo: any): any {
        // For JOIN, merge WHERE clauses and combine SELECT variables
        const combinedQuery = {
            type: 'query',
            prefixes: { ...queryOne.prefixes, ...queryTwo.prefixes },
            queryType: 'SELECT',
            variables: [...new Set([...queryOne.variables, ...queryTwo.variables])],
            where: [
                ...queryOne.where,
                ...queryTwo.where
            ]
        };
        return combinedQuery;
    }

    private combineWithUnion(queryOne: any, queryTwo: any): any {
        // For UNION, create a UNION of the WHERE clauses
        const combinedQuery = {
            type: 'query',
            prefixes: { ...queryOne.prefixes, ...queryTwo.prefixes },
            queryType: 'SELECT',
            variables: [...new Set([...queryOne.variables, ...queryTwo.variables])],
            where: [{
                type: 'union',
                patterns: [
                    queryOne.where,
                    queryTwo.where
                ]
            }]
        };
        return combinedQuery;
    }

    private combineWithCartesian(queryOne: any, queryTwo: any): any {
        // For CARTESIAN, combine WHERE clauses without any join conditions
        const combinedQuery = {
            type: 'query',
            prefixes: { ...queryOne.prefixes, ...queryTwo.prefixes },
            queryType: 'SELECT',
            variables: [...new Set([...queryOne.variables, ...queryTwo.variables])],
            where: [
                ...queryOne.where,
                ...queryTwo.where
            ]
        };
        return combinedQuery;
    }
}