import { lazy, Suspense } from 'react';

const MdxCompoents = lazy(() => import('./MdxCompoents').then(module => ({ default: module.Mdx })));

export type MdxCompoentsProps = React.ComponentProps<typeof MdxCompoents>;

export default function LazyMdxCompoents(props: MdxCompoentsProps) {
  return (
    <Suspense fallback={<></>}>
      <MdxCompoents {...props} />
    </Suspense>
  );
}
