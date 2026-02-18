import React from "react";
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="bg-slate-50 py-20 px-6 md:px-16">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            Know Your Resume Strength Before Recruiters Do.
          </h1>

          <p className="mt-6 text-lg text-slate-600">
            Analyze your resume, detect skill gaps, and improve job readiness
            with clear, data-driven insights built for modern professionals.
          </p>

          <div className="mt-8 flex gap-4">
            <button className="bg-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-800 transition transform hover:scale-105">
              Upload Resume
            </button>

            <button className="border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-100 transition">
              View Demo
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white rounded-xl shadow-md p-8 border border-slate-200"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-6">
            Resume Analysis Overview
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Resume Score</p>
              <div className="mt-2 w-full bg-slate-200 h-3 rounded-full">
                <div className="bg-blue-700 h-3 rounded-full w-3/4"></div>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500">Matched Skills</p>
              <p className="mt-1 text-slate-800 font-medium">
                React, Node.js, JavaScript
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Missing Skills</p>
              <p className="mt-1 text-slate-800 font-medium">
                MongoDB, System Design
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;
