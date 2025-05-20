# Hive Thought Rewriter

The library rewrites different RSP-QL queries to either combine or decompose. 

## Usage

### Installation

```shell
npm install hive-thought-rewriter
```

## Rewriting Queries by Combining

Different queries in RSP-QL [[1](#footnotes-1)] query format can be specified and combined together to create a single RSP-QL query.


```ts
import {QueryCombiner} from "hive-thought-rewriter";

const combiner = new QueryCombiner();

combiner.addQuery(query1);
combiner.addQuery(query2);

const combined = combiner.combine();
/**
 * This will return the RSPQL query and it's different components 
 * in a object with type Parsed Query
 * 
 * To get the query in string format
 */

const combined_query_string = combiner.ParsedToString(combined);
```


## Rewriting Queries by Decomposing

This is currently not possible and is a work in progress. 
## License

This code is copyrighted by [Ghent University - imec](https://www.ugent.be/ea/idlab/en) and released under the [MIT Licence](./LICENCE) 


### Footnotes
[1]: <a href="https://www.igi-global.com/article/rsp-ql-semantics/129761">RSP-QL Semantics: A Unifying Query Model to Explain Heterogeneity of RDF Stream Processing Systems </a>
