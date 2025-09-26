import { lazy, Suspense } from 'react';

const ThemedEditor = lazy(() => import('./ThemedEditor'));

export type ThemedEditorProps = React.ComponentProps<typeof ThemedEditor>;

export default function LazyThemedEditor(props: ThemedEditorProps) {
  return (
    <Suspense fallback={<></>}>
      <ThemedEditor {...props} />
    </Suspense>
  );
}
