import { TopNav } from "@/components/app/TopNav";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-5 pb-12 pt-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
