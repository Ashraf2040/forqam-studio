import markup from './markup';
import { scripts } from './scripts';

export const dynamic = 'force-static';

// The screen's static markup, then its classic scripts in the original order (they run as the browser parses the page,
// exactly as before). Game and screen logic lives in public/legacy/portal/*.js.
export default function Page() {
  return (
    <>
      <div style={{ display: 'contents' }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: markup }} />
      {scripts.map((src) => (
        <script key={src} src={src} />
      ))}
    </>
  );
}
