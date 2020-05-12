# DAG Maker

DAG maker utilize [topological sorting](https://en.wikipedia.org/wiki/Topological_sorting) to make directed acyclic graphs.

It can be used to solve following problems:

- Dependency resolution
- Figure out services start & stop order
- Create & destroy objects in reasonable order

## Usage

```javascript
const { dependencies, DagMaker } = require('dag-maker');

class A {
  static async create() {
    return new A();
  }
  static async destroy() {}
}

@dependencies({
  a: A,
})
class B {
  constructor(a: A) {
    this.a = a;
  }
  static async create(options: { a: A }) {
    return new B(options.a);
  }
  static async destroy() {}
}

const dagMaker = new DagMaker(A, B);
console.log(dagMaker.orderBy('dependencies'));
// [ [ 'A' ], [ 'B' ] ]

console.log(dagMaker.orderBy('dependents'));
// [ [ 'B' ], [ 'A' ] ]

const dag = await dagMaker.create();
console.log(dag);
// Map(2) { 'A' => A {}, 'B' => B { a: A {} } }
```
