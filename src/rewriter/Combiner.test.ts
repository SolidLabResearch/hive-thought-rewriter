import { Combiner } from "./Combiner";
describe("CombinerClass", () => {
 it("it should combine two queries", () => {
   const combiner = new Combiner("SELECT * WHERE { ?s ?p ?o }", "SELECT ?s WHERE { ?s ?p ?o }");
   const result = combiner.combineQueries();

   expect(result).toBe("SELECT * ?s WHERE {\n  ?s ?p ?o.\n  ?s ?p ?o.\n}");
 });
});