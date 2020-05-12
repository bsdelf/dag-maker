/**
 * Set dependencies for target.
 * @param options Vertex factories.
 */
export function dependencies(options: Record<string, VertexFactory<any>>) {
  return (target: any) => {
    Object.defineProperties(target, {
      dependencies: {
        configurable: true,
        enumerable: true,
        get() {
          return options;
        },
      },
    });
  };
}

export interface VertexFactory<T> {
  /**
   * Name.
   */
  readonly name: string;

  /**
   * Optional dependencies.
   */
  readonly dependencies?: Record<string, VertexFactory<any>>;

  /**
   * Create a vertex with given dependencies.
   */
  create(options: Record<string, any>): Promise<T>;

  /**
   * Destroy a given vertex.
   */
  destroy(vertex: T): Promise<void>;
}

interface VertexMetadata {
  factory: VertexFactory<any>;
  dependencies: Set<string>;
  dependents: Set<string>;
}

type VertexMetadataMap = Map<string, VertexMetadata>;

const copyVertexMetadataMap = (input: VertexMetadataMap) => {
  const output = new Map<string, VertexMetadata>();
  for (const [key, value] of input.entries()) {
    output.set(key, {
      factory: value.factory,
      dependencies: new Set(value.dependencies),
      dependents: new Set(value.dependents),
    });
  }
  return output;
};

export class DagMaker {
  private vertexMetadataMap: VertexMetadataMap;

  /**
   * Constructor of DagMaker.
   * @param vertexFactories DAG vertex factories.
   */
  constructor(...vertexFactories: VertexFactory<any>[]) {
    const vertexMetadataMap = new Map<string, VertexMetadata>();
    if (Array.isArray(vertexFactories)) {
      // dedup
      const vertexFactoryNames = new Set<string>();
      const vertexFactoryQueue: VertexFactory<any>[] = [];
      for (const vertexFactory of vertexFactories) {
        if (!vertexFactoryNames.has(vertexFactory.name)) {
          vertexFactoryNames.add(vertexFactory.name);
          vertexFactoryQueue.push(vertexFactory);
        }
      }
      // init vertex metadata map
      while (vertexFactoryQueue.length > 0) {
        const vertexFactory = vertexFactoryQueue.shift()!;
        const dependencies = new Set<string>();
        if (vertexFactory.dependencies) {
          for (const dependency of Object.values(vertexFactory.dependencies)) {
            dependencies.add(dependency.name);
            // add implicit vertex factory
            if (!vertexFactoryNames.has(dependency.name)) {
              vertexFactoryNames.add(dependency.name);
              vertexFactoryQueue.push(dependency);
            }
          }
        }
        vertexMetadataMap.set(vertexFactory.name, {
          factory: vertexFactory,
          dependencies,
          dependents: new Set<string>(),
        });
      }
      // figure out dependents
      for (const [name, metadata] of vertexMetadataMap) {
        for (const dependencyName of metadata.dependencies) {
          const dependencyMetadata = vertexMetadataMap.get(dependencyName);
          if (dependencyMetadata) {
            dependencyMetadata.dependents.add(name);
          }
        }
      }
    }
    this.vertexMetadataMap = vertexMetadataMap;
  }

  /**
   * Create DAG vertexes in dependencies order.
   * @returns DAG vetexes.
   */
  async create() {
    const dag = new Map<string, any>();
    const layers = this.orderBy('dependencies');
    for (const layer of layers) {
      for (const name of layer) {
        const metadata = this.vertexMetadataMap.get(name);
        if (metadata) {
          const dependencies = metadata.factory.dependencies || {};
          const options = Object.entries(dependencies).reduce((acc, [name, factory]) => {
            const vertex = dag.get(factory.name);
            if (!vertex) {
              throw new Error(`Vertex "${factory.name}" not found`);
            }
            return { ...acc, [name]: vertex };
          }, {});
          const vertex = await metadata.factory.create(options);
          dag.set(name, vertex);
        }
      }
    }
    return dag;
  }

  /**
   * Destroy DAG vertexes in dependents order.
   * @param dag DAG vertexes.
   */
  async destroy(dag: Map<string, any>) {
    const layers = this.orderBy('dependents');
    for (const layer of layers) {
      for (const name of layer) {
        const vertex = dag.get(name);
        if (vertex) {
          const metadata = this.vertexMetadataMap.get(name);
          if (!metadata) {
            throw new Error(`Vertex factory "${name}" not found`);
          }
          await metadata.factory.destroy(vertex);
        }
      }
    }
  }

  /**
   * Order DAG vertex factories.
   * @param property Order by dependencies or dependents.
   * @returns Ordered DAG vertex factory names, grouped by layer.
   */
  orderBy(property: 'dependencies' | 'dependents') {
    const order: string[][] = [];
    const adjacentProperty = property === 'dependencies' ? 'dependents' : 'dependencies';
    const vertexMetadataMap = copyVertexMetadataMap(this.vertexMetadataMap);
    while (vertexMetadataMap.size > 0) {
      // find leaves
      const leaveNames: string[] = [];
      const adjacentNames = new Set<string>();
      for (const [name, metadata] of vertexMetadataMap.entries()) {
        if (metadata[property].size === 0) {
          leaveNames.push(name);
          for (const adjacentName of metadata[adjacentProperty]) {
            adjacentNames.add(adjacentName);
          }
        }
      }
      if (leaveNames.length === 0) {
        throw new Error('Circular dependency detected');
      }
      order.push(leaveNames.sort());
      // prune leaves
      for (const name of leaveNames) {
        vertexMetadataMap.delete(name);
      }
      for (const adjacentName of adjacentNames) {
        const adjacent = vertexMetadataMap.get(adjacentName);
        if (adjacent) {
          for (const leafName of leaveNames) {
            adjacent[property].delete(leafName);
          }
        }
      }
    }
    return order;
  }
}
