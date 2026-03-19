import React from 'react';

type PasswordChecklistProps = {
  password?: string;
};

const PasswordChecklist: React.FC<PasswordChecklistProps> = ({ password = '' }) => {
  if (!password) return null;

  const rules = [
    { label: 'At least 8 characters long', passed: password.length >= 8 },
    { label: 'At least one uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'At least one digit', passed: /\d/.test(password) },
    { label: 'At least one special character', passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const violated = rules.filter(r => !r.passed);
  if (violated.length === 0) return null;

  return (
    <div className="text-sm mt-2">
      <ul className="space-y-1">
        {violated.map(r => (
          <li key={r.label} className="flex items-center text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordChecklist;
