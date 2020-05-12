import it, { ExecutionContext } from 'ava';

import { DagMaker, dependencies } from '../src';

const testDagMaker = async (
  t: ExecutionContext,
  constructors: any[],
  orders: { dependencies: string[][]; dependents: string[][] }
) => {
  const dagMaker = new DagMaker(...constructors);
  {
    const expectedOrder = orders.dependencies;
    const actualOrder = dagMaker.orderBy('dependencies');
    t.deepEqual(actualOrder, expectedOrder, 'order by dependencies');
  }
  {
    const expectedOrder = orders.dependents;
    const actualOrder = dagMaker.orderBy('dependents');
    t.deepEqual(actualOrder, expectedOrder, 'order by dependents');
  }
  {
    const dag = await dagMaker.create();
    for (const constructor of constructors) {
      const vertex = dag.get(constructor.name);
      t.true(vertex !== undefined);
      t.true(vertex instanceof constructor);
    }
    await dagMaker.destroy(dag);
    for (const constructor of constructors) {
      const vertex = dag.get(constructor.name);
      t.true(vertex !== undefined);
      t.false(vertex.alive);
    }
  }
};

const testOptions = (t: ExecutionContext, options: any, constructors: Record<string, any>) => {
  for (const [name, constructor] of Object.entries(constructors)) {
    t.true(Object.hasOwnProperty.call(options, name), `options.${name} exists`);
    t.true(
      options[name] instanceof constructor,
      `options.${name} is an instance of ${constructor.name}`
    );
  }
};

it('A, B, C, D', async (t) => {
  class A {
    alive = true;
    static async create() {
      return new A();
    }
    static async destroy(a: A) {
      t.true(a instanceof A);
      a.alive = false;
    }
  }

  class B {
    alive = true;
    static async create() {
      return new B();
    }
    static async destroy(b: B) {
      t.true(b instanceof B);
      b.alive = false;
    }
  }

  class C {
    alive = true;
    static async create() {
      return new C();
    }
    static async destroy(c: C) {
      t.true(c instanceof C);
      c.alive = false;
    }
  }

  class D {
    alive = true;
    static async create() {
      return new D();
    }
    static async destroy(d: D) {
      t.true(d instanceof D);
      d.alive = false;
    }
  }

  await testDagMaker(t, [A, B, C, D], {
    dependencies: [['A', 'B', 'C', 'D']],
    dependents: [['A', 'B', 'C', 'D']],
  });
});

it('A < B < C < D', async (t) => {
  class A {
    alive = true;
    static async create() {
      return new A();
    }
    static async destroy(a: A) {
      t.true(a instanceof A);
      a.alive = false;
    }
  }

  @dependencies({
    a: A,
  })
  class B {
    alive = true;
    static async create(options: { a: A }) {
      testOptions(t, options, { a: A });
      return new B();
    }
    static async destroy(b: B) {
      t.true(b instanceof B);
      b.alive = false;
    }
  }

  @dependencies({
    b: B,
  })
  class C {
    alive = true;
    static async create(options: { b: B }) {
      testOptions(t, options, { b: B });
      return new C();
    }
    static async destroy(c: C) {
      t.true(c instanceof C);
      c.alive = false;
    }
  }

  @dependencies({
    c: C,
  })
  class D {
    alive = true;
    static async create(options: { c: C }) {
      testOptions(t, options, { c: C });
      return new D();
    }
    static async destroy(d: D) {
      t.true(d instanceof D);
      d.alive = false;
    }
  }

  await testDagMaker(t, [A, B, C, D], {
    dependencies: [['A'], ['B'], ['C'], ['D']],
    dependents: [['D'], ['C'], ['B'], ['A']],
  });

  await testDagMaker(t, [D], {
    dependencies: [['A'], ['B'], ['C'], ['D']],
    dependents: [['D'], ['C'], ['B'], ['A']],
  });
});

it('(A, B) < C < D', async (t) => {
  class A {
    alive = true;
    static async create() {
      return new A();
    }
    static async destroy(a: A) {
      t.true(a instanceof A);
      a.alive = false;
    }
  }

  class B {
    alive = true;
    static async create() {
      return new B();
    }
    static async destroy(b: B) {
      t.true(b instanceof B);
      b.alive = false;
    }
  }

  @dependencies({
    a: A,
    b: B,
  })
  class C {
    alive = true;
    static async create(options: { a: A; b: B }) {
      testOptions(t, options, { a: A, b: B });
      return new C();
    }
    static async destroy(c: C) {
      t.true(c instanceof C);
      c.alive = false;
    }
  }

  @dependencies({
    c: C,
  })
  class D {
    alive = true;
    static async create(options: { c: C }) {
      testOptions(t, options, { c: C });
      return new D();
    }
    static async destroy(d: D) {
      t.true(d instanceof D);
      d.alive = false;
    }
  }

  await testDagMaker(t, [A, B, C, D], {
    dependencies: [['A', 'B'], ['C'], ['D']],
    dependents: [['D'], ['C'], ['A', 'B']],
  });

  await testDagMaker(t, [C, D], {
    dependencies: [['A', 'B'], ['C'], ['D']],
    dependents: [['D'], ['C'], ['A', 'B']],
  });
});

it('A < (B, C) < D', async (t) => {
  class A {
    alive = true;
    static async create() {
      return new A();
    }
    static async destroy(a: A) {
      t.true(a instanceof A);
      a.alive = false;
    }
  }

  @dependencies({
    a: A,
  })
  class B {
    alive = true;
    static async create(options: { a: A }) {
      testOptions(t, options, { a: A });
      return new B();
    }
    static async destroy(b: B) {
      t.true(b instanceof B);
      b.alive = false;
    }
  }

  @dependencies({
    a: A,
  })
  class C {
    alive = true;
    static async create(options: { a: A }) {
      testOptions(t, options, { a: A });
      return new C();
    }
    static async destroy(c: C) {
      t.true(c instanceof C);
      c.alive = false;
    }
  }

  @dependencies({
    b: B,
    c: C,
  })
  class D {
    alive = true;
    static async create(options: { b: B; c: C }) {
      testOptions(t, options, { b: B, c: C });
      return new D();
    }
    static async destroy(d: D) {
      t.true(d instanceof D);
      d.alive = false;
    }
  }

  await testDagMaker(t, [A, B, C, D], {
    dependencies: [['A'], ['B', 'C'], ['D']],
    dependents: [['D'], ['B', 'C'], ['A']],
  });

  await testDagMaker(t, [B, C, D], {
    dependencies: [['A'], ['B', 'C'], ['D']],
    dependents: [['D'], ['B', 'C'], ['A']],
  });
});

it('A < B < (C, D)', async (t) => {
  class A {
    alive = true;
    static async create() {
      return new A();
    }
    static async destroy(a: A) {
      t.true(a instanceof A);
      a.alive = false;
    }
  }

  @dependencies({
    a: A,
  })
  class B {
    alive = true;
    static async create(options: { a: A }) {
      testOptions(t, options, { a: A });
      return new B();
    }
    static async destroy(b: B) {
      t.true(b instanceof B);
      b.alive = false;
    }
  }

  @dependencies({
    b: B,
  })
  class C {
    alive = true;
    static async create(options: { b: B }) {
      testOptions(t, options, { b: B });
      return new C();
    }
    static async destroy(c: C) {
      t.true(c instanceof C);
      c.alive = false;
    }
  }

  @dependencies({
    b: B,
  })
  class D {
    alive = true;
    static async create(options: { b: B }) {
      testOptions(t, options, { b: B });
      return new D();
    }
    static async destroy(d: D) {
      t.true(d instanceof D);
      d.alive = false;
    }
  }

  await testDagMaker(t, [A, B, C, D], {
    dependencies: [['A'], ['B'], ['C', 'D']],
    dependents: [['C', 'D'], ['B'], ['A']],
  });

  await testDagMaker(t, [C, D], {
    dependencies: [['A'], ['B'], ['C', 'D']],
    dependents: [['C', 'D'], ['B'], ['A']],
  });
});
