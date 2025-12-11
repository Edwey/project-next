import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 w-full max-w-md mx-4">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">VoltaTech University</h1>
        
        <div className="mt-8 space-y-4">
          <Link 
            href="/login"
            className="block w-full text-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            Log In to Portal
          </Link>
          
          <Link
            href="/admissions/apply"
            className="block w-full text-center px-6 py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            Admissions & Applications
          </Link>
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Need help? Contact the university ICT support desk.
        </p>
      </div>
    </div>
  );
}
