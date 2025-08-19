import React, { useState, useEffect } from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import AuthForm from './components/AuthForm';

import UserProfile from './components/UserProfile';

import FileUpload from './components/FileUpload';

import ReportTable from './components/ReportTable';

import TrendChart from './components/TrendChart';

import LoadingSpinner from './components/LoadingSpinner';

import ForgotPassword from './components/ForgotPassword';

import ResetPassword from './components/ResetPassword';

import LandingPage from './components/LandingPage';

import { getCurrentUser } from './utils/api';

import './styles/App.css';

import FAQ from "./components/FAQ";



// Dashboard Component - Main authenticated app

function Dashboard({ user, setUser }) {

  const [reportData, setReportData] = useState(null);

  const [trendData, setTrendData] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);



  const handleLogout = () => {

    setUser(null);

    setReportData(null);

    setTrendData(null);

    setError(null);

  };



  const handleFileProcessed = (data) => {

    setReportData(data);

    setError(null);

  };



  const handleTrendData = (trends) => {

    setTrendData(trends);

  };



  const handleError = (errorMessage) => {

    setError(errorMessage);

    setReportData(null);

    setTrendData(null);

  };



  const handleReset = () => {

    setReportData(null);

    setTrendData(null);

    setError(null);

  };



  return (

    <div className="app">

      <header className="app-header">

        <div className="header-content">

          <div className="header-text">

            <h1>🏥 Health Report Analyzer</h1>

            <p>Welcome back, {user.firstName}! Upload your lab report and get instant insights.</p>

          </div>

          <UserProfile user={user} onLogout={handleLogout} />

        </div>

      </header>



      <main className="app-main">

        {error && (

          <div className="error-banner">

            <span>❌ {error}</span>

            <button onClick={handleReset} className="btn-retry">Try Again</button>

          </div>

        )}



        {loading && <LoadingSpinner />}



        {!reportData && !loading && (

          <FileUpload

            onFileProcessed={handleFileProcessed}

            onError={handleError}

            onLoadingChange={setLoading}

          />

        )}



        {reportData && (

          <div className="results-section">

            <div className="results-header">

              <h2>📊 Analysis Results</h2>

              <button onClick={handleReset} className="btn-new-upload">

                Upload New Report

              </button>

            </div>



            <ReportTable

              data={reportData}

              onTrendData={handleTrendData}

            />



            {trendData && (

              <TrendChart

                data={trendData}

                reportId={reportData.reportId}

              />

            )}

          </div>

        )}

      </main>



      {/* ✅ FAQ always before footer */}

      <FAQ />



      <footer className="app-footer">

        <p>⚠️ This tool is for informational purposes only. Always consult with healthcare professionals.</p>

      </footer>

    </div>

  );

}



function App() {

  const [user, setUser] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);



  // Check for existing user session when app loads

  useEffect(() => {

    const checkAuth = async () => {

      const token = localStorage.getItem('token');

      const userData = localStorage.getItem('user');

     

      if (token && userData) {

        try {

          await getCurrentUser();

          setUser(JSON.parse(userData));

        } catch (error) {

          // Clear invalid session data

          localStorage.removeItem('token');

          localStorage.removeItem('user');

        }

      }

      setAuthLoading(false);

    };



    checkAuth();

  }, []);



  const handleLogin = (userData, token) => {

    setUser(userData);

  };



  // Display loading screen while checking authentication status

  if (authLoading) {

    return (

      <div className="app">

        <div className="auth-loading">

          <LoadingSpinner />

        </div>

      </div>

    );

  }



  return (

    <Router>

      <div className="app">

        <Routes>

          {/* Landing page - default route for non-authenticated users */}

          <Route

            path="/"

            element={

              user ? <Navigate to="/dashboard" /> : (

                <>

                  <LandingPage user={user} />

                  <FAQ />

                  <footer className="app-footer">

                    <p>⚠️ This tool is for informational purposes only. Always consult with healthcare professionals.</p>

                  </footer>

                </>

              )

            }

          />

         

          {/* Auth form route */}

          <Route

            path="/login"

            element={

              user ? <Navigate to="/dashboard" /> : (

                <>

                  <header className="app-header">

                    <h1>🏥 Health Report Analyzer</h1>

                    <p>Secure platform to analyze your health reports with AI insights</p>

                  </header>

                  <main className="app-main">

                    <AuthForm onLogin={handleLogin} />

                  </main>

                  <FAQ />

                  <footer className="app-footer">

                    <p>⚠️ This tool is for informational purposes only. Always consult with healthcare professionals.</p>

                  </footer>

                </>

              )

            }

          />

         

          <Route

            path="/forgot-password"

            element={

              user ? <Navigate to="/dashboard" /> : (

                <>

                  <header className="app-header">

                    <h1>🏥 Health Report Analyzer</h1>

                    <p>Reset your password</p>

                  </header>

                  <main className="app-main">

                    <ForgotPassword />

                  </main>

                  <FAQ />

                  <footer className="app-footer">

                    <p>⚠️ This tool is for informational purposes only. Always consult with healthcare professionals.</p>

                  </footer>

                </>

              )

            }

          />

         

          <Route

            path="/reset-password/:token"

            element={

              user ? <Navigate to="/dashboard" /> : (

                <>

                  <header className="app-header">

                    <h1>🏥 Health Report Analyzer</h1>

                    <p>Enter your new password</p>

                  </header>

                  <main className="app-main">

                    <ResetPassword />

                  </main>

                  <FAQ />

                  <footer className="app-footer">

                    <p>⚠️ This tool is for informational purposes only. Always consult with healthcare professionals.</p>

                  </footer>

                </>

              )

            }

          />



          {/* Protected route */}

          <Route

            path="/dashboard"

            element={

              user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/" />

            }

          />



          {/* Catch all route */}

          <Route path="*" element={<Navigate to="/" />} />

        </Routes>

      </div>

    </Router>

  );

}



export default App;

