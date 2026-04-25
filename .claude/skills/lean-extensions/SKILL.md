```markdown
# lean-extensions Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `lean-extensions` repository. The codebase is a TypeScript project using the React framework, with a focus on consistent code style, clear file organization, and robust testing using Vitest. By following these patterns, you'll write code that fits seamlessly into the project and is easy for other contributors to understand and maintain.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `myComponent.tsx`, `useCustomHook.ts`

### Import Style
- Use **relative imports** for all modules.
  - Example:
    ```typescript
    import { MyComponent } from './myComponent';
    ```

### Export Style
- Use a **mixed export style** (both named and default exports are present).
  - Example:
    ```typescript
    // Named export
    export function useCustomHook() { ... }

    // Default export
    export default MyComponent;
    ```

### Commit Patterns
- Commit messages are **freeform** with occasional prefixes (e.g., `tests`).
- Average commit message length: **44 characters**.
  - Example:
    ```
    tests: add coverage for useCustomHook edge cases
    ```

## Workflows

*No automated workflows detected in this repository.*

## Testing Patterns

- **Testing Framework:** [Vitest](https://vitest.dev/)
- **Test File Pattern:** Files ending with `.test.ts`
  - Example: `myComponent.test.ts`
- **Test Structure:**
  - Use standard Vitest syntax for organizing and writing tests.
  - Example:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { myFunction } from './myFunction';

    describe('myFunction', () => {
      it('should return true for valid input', () => {
        expect(myFunction('valid')).toBe(true);
      });
    });
    ```

## Commands

| Command    | Purpose                               |
|------------|---------------------------------------|
| /test      | Run all Vitest tests                  |
| /lint      | Run linter to check code style        |
| /build     | Build the project                     |

```