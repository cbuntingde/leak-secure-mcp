# Publishing to npm

**Copyright 2025 Chris Bunting <cbuntingde@gmail.com>**

## Pre-Publishing Checklist

Before publishing, make sure to:

1. **Update package.json**:
   - Update the `repository` field with your actual GitHub repository URL
   - Update the `bugs` and `homepage` fields with your repository URL
   - Verify version number
   - Ensure all required fields are present

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Test the build**:
   ```bash
   npm start
   ```

4. **Verify files to be published**:
   ```bash
   npm pack --dry-run
   ```
   This will show you exactly what files will be included in the package.

## Publishing Steps

### 1. Create npm Account (if you don't have one)

```bash
npm adduser
```

Or sign up at https://www.npmjs.com/signup

### 2. Login to npm

```bash
npm login
```

### 3. Verify Package Name Availability

Check if the package name `leak-secure-mcp` is available:
```bash
npm view leak-secure-mcp
```

If it returns 404, the name is available. If it returns package info, you may need to:
- Choose a different name (update package.json)
- Use a scoped package name like `@yourusername/leak-secure-mcp`

### 4. Update Repository URLs

Before publishing, update these fields in `package.json`:
- `repository.url`: Your actual GitHub repository URL
- `bugs.url`: Your repository issues URL
- `homepage`: Your repository homepage URL

### 5. Publish

**For first-time publishing:**
```bash
npm publish
```

**For updates:**
```bash
# Update version (patch, minor, or major)
npm version patch  # or minor, or major

# Publish
npm publish
```

**For scoped packages (if using @username/package-name):**
```bash
npm publish --access public
```

### 6. Verify Publication

Check your package on npm:
```bash
npm view leak-secure-mcp
```

Or visit: https://www.npmjs.com/package/leak-secure-mcp

## Post-Publishing

1. **Create a GitHub release** with the same version number
2. **Update documentation** if needed
3. **Announce** the package (if desired)

## Version Management

Use semantic versioning:
- `patch` (1.0.0 → 1.0.1): Bug fixes
- `minor` (1.0.0 → 1.1.0): New features, backward compatible
- `major` (1.0.0 → 2.0.0): Breaking changes

```bash
npm version patch   # Increments patch version
npm version minor   # Increments minor version
npm version major   # Increments major version
```

## Troubleshooting

### Package name already taken
- Use a scoped package: `@yourusername/leak-secure-mcp`
- Update package.json name field
- Publish with: `npm publish --access public`

### Authentication errors
- Run `npm login` again
- Check npm registry: `npm config get registry` (should be https://registry.npmjs.org/)

### Build errors
- Ensure TypeScript compiles: `npm run build`
- Check for TypeScript errors: `npx tsc --noEmit`

## Unpublishing (if needed)

**Warning**: Unpublishing is only allowed within 72 hours of publishing.

```bash
npm unpublish leak-secure-mcp --force
```

For versions:
```bash
npm unpublish leak-secure-mcp@1.0.0
```
