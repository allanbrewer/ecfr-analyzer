import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="relative mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">ECFR Analyzer</h1>
          <div className="h-1 w-32 bg-red-600 rounded-full mx-auto"></div>
        </div>
        <p className="text-xl mb-8 text-gray-700">Analysis of Electronic Code of Federal Regulations</p>
        <Link
          href="/dashboard"
          className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors inline-block shadow-md hover:shadow-lg"
        >
          View Dashboard
        </Link>
      </div>
    </div>
  );
}
