import { DefaultNamingStrategy } from "typeorm";

const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

/** camelCase properties -> snake_case columns. */
export class SnakeNamingStrategy extends DefaultNamingStrategy {
  columnName(propertyName, customName, embeddedPrefixes) {
    return snake([...embeddedPrefixes, customName || propertyName].join("_"));
  }
  joinColumnName(relationName, referencedColumnName) {
    return snake(`${relationName}_${referencedColumnName}`);
  }
}
