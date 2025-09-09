import React from 'react';
import { FiBarChart2 } from 'react-icons/fi';

const LoadingState = ({ message = "Generating visualization..." }) => {
  return (
    <div className="bg-[#4A3222] rounded-lg p-8 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#D9B799] mx-auto mb-4"></div>
      <FiBarChart2 className="mx-auto text-[#D9B799] text-3xl mb-3" />
      <p className="text-[#D9B799] text-lg font-medium">{message}</p>
      <p className="text-[#8C6A58] text-sm mt-2">This may take a few seconds...</p>
    </div>
  );
};

export default LoadingState;
