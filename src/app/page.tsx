import { AppShell } from '@/components/layout/AppShell';
import { HydrationGuard } from '@/components/HydrationGuard';

export default function Home() {
  return (
    <HydrationGuard>
      <AppShell />
    </HydrationGuard>
  );
}
