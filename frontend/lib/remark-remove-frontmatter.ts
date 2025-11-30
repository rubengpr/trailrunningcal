/**
 * Remark plugin to remove frontmatter nodes from the AST
 * This prevents frontmatter from being rendered in the output
 * Using simplified structure for Next.js/Turbopack compatibility
 */
export default function remarkRemoveFrontmatter() {
  return (tree: any) => {
    if (tree?.children) {
      tree.children = tree.children.filter((node: any) => node.type !== 'yaml');
    }
  };
}
