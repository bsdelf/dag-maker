# DAG Maker

DAG maker utilize [topological sorting](https://en.wikipedia.org/wiki/Topological_sorting) to make directed acyclic graphs.

It can be used to solve following problems:

- Dependency resolution & injection
- Figure out services start & stop order
- Create & destroy objects in reasonable order

## Installation

```
npm i dag-maker
```

## Usage

Suppose we have two classes A and B. The dependency graph as follows:

```
A <- B
```

To instantiate them, first we create an instance of A, then pass the instance to B's constructor. Since there are only two classes, it's quite straightforward.

However, when it comes to a dozen classes with complex dependencies, it's no longer feasible to figure out the proper construction order manually. Not to mention the destruction order.

Here is an example (in TypeScript) presents how to solve this kind of problem with `dag-maker`:

```typescript
import { dependencies, DagMaker } from 'dag-maker';

class A {
  static async create() {
    console.log('create A');
    return new A();
  }
  static async destroy(a: A) {
    console.log('destroy A:', a);
  }
}

@dependencies({
  a: A,
})
class B {
  constructor(a: A) {
    this.a = a;
  }
  static async create(options: { a: A }) {
    console.log('create B');
    return new B(options.a);
  }
  static async destroy(b: B) {
    console.log('destroy B:', b);
  }
}

const dagMaker = new DagMaker(A, B);
console.log(dagMaker.orderBy('dependencies'));
// [ [ 'A' ], [ 'B' ] ]

console.log(dagMaker.orderBy('dependents'));
// [ [ 'B' ], [ 'A' ] ]

const dag = await dagMaker.create();
console.log(dag);
// Map(2) { 'A' => A {}, 'B' => B { a: A {} } }

await dagMaker.destroy(dag);
// destroy B: B { a: A {} }
// destroy A: A {}
```

In this example, we implement factory methods `create()` and `destroy()` right inside class A and B, and declare B's dependencies with a decorator `@dependencies`. If you don't want to use decorator, declare a static variable named `dependencies` could achieve the same semantic. After then, we create a `DagMaker` for class A and B. Eventually, the DAG maker will inspect `dependencies` property and figure out how to construct A and B.
