export interface Validator<T> {
  parse(input: unknown): T;
}
