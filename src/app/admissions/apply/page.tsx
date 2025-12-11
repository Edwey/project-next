'use client';

import { useState, useEffect } from 'react';

type Program = {
  id: number;
  program_name: string;
  program_code: string;
};

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    program_id: '',
    wasse_aggregate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);

  // Fetch programs from the database
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch('/api/programs');
        if (response.ok) {
          const data = await response.json();
          setPrograms(data.programs || []);
        }
      } catch (error) {
        console.error('Failed to fetch programs:', error);
        // Fallback to mock data if API fails
        setPrograms([
          { id: 1, program_name: 'Computer Science', program_code: 'CS' },
          { id: 2, program_name: 'Information Technology', program_code: 'IT' },
          { id: 3, program_name: 'Business Administration', program_code: 'BA' },
          { id: 4, program_name: 'Electrical Engineering', program_code: 'EE' },
        ]);
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.program_id) newErrors.program_id = 'Please select a program';
    if (!formData.wasse_aggregate) {
      newErrors.wasse_aggregate = 'WASSCE aggregate is required';
    } else if (Number.isNaN(Number(formData.wasse_aggregate)) || 
               Number(formData.wasse_aggregate) < 6 || 
               Number(formData.wasse_aggregate) > 48) {
      newErrors.wasse_aggregate = 'WASSCE aggregate must be between 6 and 48';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/admissions/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      
      setSuccess(true);
      // Optionally reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        program_id: '',
        wasse_aggregate: '',
      });
      
      // Redirect to success page or show success message
      // router.push('/admissions/success');
    } catch (error: any) {
      setErrors({
        submit: error.message || 'Failed to submit application. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for your application to VoltaTech University. We've received your information and will review it shortly.
            You will receive a confirmation email with further instructions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setSuccess(false)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Submit Another Application
            </button>
            <a
              href="/"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-center"
            >
              Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Apply for Admission</h1>
          <p className="text-gray-600">Fill out the form below to start your application</p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    You can track your application status via email.
                  </p>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 placeholder-gray-500 bg-white py-3 px-3 ${errors.first_name ? 'border-red-500' : ''}`}
                    required
                  />
                  {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 placeholder-gray-500 bg-white py-3 px-3 ${errors.last_name ? 'border-red-500' : ''}`}
                    required
                  />
                  {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 placeholder-gray-500 bg-white py-3 px-3 ${errors.email ? 'border-red-500' : ''}`}
                    required
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 placeholder-gray-500 bg-white py-3 px-3"
                  />
                </div>

                <div>
                  <label htmlFor="program_id" className="block text-sm font-medium text-gray-700">
                    Program <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="program_id"
                    name="program_id"
                    value={formData.program_id}
                    onChange={handleChange}
                    disabled={isLoadingPrograms}
                    className={`mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 placeholder-gray-500 bg-white py-3 px-3 ${errors.program_id ? 'border-red-500' : ''} ${isLoadingPrograms ? 'bg-gray-100' : ''}`}
                    required
                  >
                    <option value="">
                      {isLoadingPrograms ? '-- Loading Programs --' : '-- Choose a Program --'}
                    </option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.program_name} ({program.program_code})
                      </option>
                    ))}
                  </select>
                  {errors.program_id && <p className="mt-1 text-sm text-red-600">{errors.program_id}</p>}
                </div>

                <div>
                  <label htmlFor="wasse_aggregate" className="block text-sm font-medium text-gray-700">
                    WASSCE Aggregate <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 block font-normal">(Between 6 and 48)</span>
                  </label>
                  <input
                    type="number"
                    id="wasse_aggregate"
                    name="wasse_aggregate"
                    min="6"
                    max="48"
                    value={formData.wasse_aggregate}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900 placeholder-gray-500 bg-white py-3 px-3 ${errors.wasse_aggregate ? 'border-red-500' : ''}`}
                    required
                  />
                  {errors.wasse_aggregate && <p className="mt-1 text-sm text-red-600">{errors.wasse_aggregate}</p>}
                </div>
              </div>

              <div className="flex items-center justify-end pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
