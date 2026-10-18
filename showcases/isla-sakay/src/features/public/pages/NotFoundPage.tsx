import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '@/styles/pages/NotFoundPage.css';

export default function NotFoundPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 focus:outline-none">
      <div className={`text-center transition-all duration-500 ${isLoaded ? 'animate-fade-in-up' : 'opacity-0 translate-y-10'}`}>
        <div className="mb-8 animate-float">
          <div className="text-8xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
            404
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Oops! Page Not Found
        </h1>

        <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/home"
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            Go Home
          </Link>
          <Link
            to="/dashboard"
            className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-16 flex justify-center">
          <div className="text-6xl animate-pulse-scale">
            🧭
          </div>
        </div>
      </div>
    </main>
  );
}
