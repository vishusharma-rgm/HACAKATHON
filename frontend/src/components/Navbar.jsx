import React from "react";

const Navbar = () => {
  return (
    <nav className="w-full bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 md:px-16 py-4 flex items-center justify-between">
        <div className="text-xl font-bold text-slate-900">
          ResumeIQ
        </div>

        <div className="hidden md:flex items-center gap-8 text-slate-600 font-medium">
          <a href="#features" className="hover:text-blue-700 transition">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-blue-700 transition">
            How It Works
          </a>
          <a href="#contact" className="hover:text-blue-700 transition">
            Contact
          </a>
        </div>

        <div>
          <button className="bg-blue-700 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-800 transition">
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
