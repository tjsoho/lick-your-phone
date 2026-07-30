# Cursor AI Code Review and Creation Rules

## General Principles

1. Always check for existing code patterns and conventions in the codebase
2. Maintain consistency with existing code style and architecture
3. Follow TypeScript best practices and type safety
4. Ensure proper error handling and edge cases
5. Write clean, maintainable, and well-documented code

## Code Structure

1. Use functional components with TypeScript
2. Implement proper component composition
3. Follow the single responsibility principle
4. Keep components small and focused
5. Use proper file organization and naming conventions
6. Keep components to maximum of 50 lines.
7. Each component should have a single responsibility.
8. Each component should be a single file.
9. All backend code should be in the `src/app/api` folder.
10. All frontend code should be in the `src/app` folder.
11. All components should be in the `src/components` folder.
12. All pages should be in the `src/app` folder.
13. All styles should be in the `src/styles` folder.
14. All images should be in the `src/images` folder.
15. All fonts should be in the `src/fonts` folder.

Every file should contain coding notes in the following format, with the NOTES section always at the top. If a section (e.g., Hooks, Functions) is not used in the file, omit that section from the documentation block:

```md
/\* ************************************************************
                        NOTES
************************************************************ _/
// Brief description of the file/component
/_ ************************************************************
                        IMPORTS
************************************************************ _/
// ...
/_ ************************************************************
                        Hooks
************************************************************ _/
// ... (omit if not used)
/_ ************************************************************
                        Functions
************************************************************ _/
// ... (omit if not used)
/_ ************************************************************
                        Components
************************************************************ _/
// ...
/_ ************************************************************
                        RENDER  
************************************************************ _/
// ...
/_ ************************************************************
                        EXPORTS
************************************************************ \*/
// ...
```

## State Management

1. Use React hooks appropriately
2. Implement proper state initialization
3. Handle state updates safely
4. Consider performance implications
5. Document state dependencies

## TypeScript Rules

1. Define proper interfaces and types
2. Avoid using `any` type
3. Use proper type guards
4. Implement proper error types
5. Use strict type checking

## Testing Requirements

1. Write unit tests for critical functionality
2. Test edge cases and error scenarios
3. Mock external dependencies
4. Use proper testing utilities
5. Maintain good test coverage

## Performance Guidelines

1. Implement proper memoization
2. Optimize re-renders
3. Use proper loading states
4. Implement proper error boundaries
5. Consider bundle size implications

## Code Review Checklist

Before creating or modifying code, Cursor AI should:

1. Review existing code patterns
2. Check for similar implementations
3. Verify type safety
4. Ensure proper error handling
5. Validate against these rules

## Project-Specific Rules

1. Follow Next.js best practices
2. Use Tailwind CSS for styling
3. Implement Framer Motion animations properly
4. Follow the project's file structure
5. Use proper import/export patterns

## Error Handling

1. Implement proper error boundaries
2. Use proper error types
3. Handle async errors appropriately
4. Provide meaningful error messages
5. Log errors properly

## Accessibility

1. Use semantic HTML
2. Implement proper ARIA attributes
3. Ensure keyboard navigation
4. Maintain proper color contrast
5. Test with screen readers

## Review Process

When reviewing code, Cursor AI should:

1. Check against these rules
2. Provide specific feedback
3. Suggest improvements
4. Highlight potential issues
5. Recommend best practices

## Implementation Guidelines

When creating new code, Cursor AI should:

1. Reference these rules
2. Follow existing patterns
3. Implement proper types
4. Add necessary documentation
5. Consider edge cases

## Maintenance

1. Keep dependencies updated
2. Remove unused code
3. Update documentation
4. Maintain consistent style
5. Follow version control best practices
