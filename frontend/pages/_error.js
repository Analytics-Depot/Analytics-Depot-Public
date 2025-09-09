import React from "react";
function Error({ statusCode }) {
  return (
    <div className="min-h-screen bg-[#2D1F14] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#F0E6DA] mb-4">
          {statusCode
            ? `An error ${statusCode} occurred on server`
            : "An error occurred on client"}
        </h1>
        <p className="text-[#8C6A58]">
          Please try refreshing the page or contact support if the problem
          persists.
        </p>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
