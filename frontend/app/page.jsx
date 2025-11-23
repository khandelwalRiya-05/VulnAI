"use client"

import { useState, useEffect } from "react"
import { GoogleLogin } from '@react-oauth/google';
import {
  BarChart3,
  Shield,
  Brain,
  Activity,
  Menu,
  X,
  Sun,
  Moon,
  Upload,
  Clock,
  Home,
  BookOpen,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Zap,
  LogOut,
} from "lucide-react"
import { 
  uploadModel, 
  uploadTestData, 
  runScan, 
  getScanResults,
  authenticateWithGoogle,
  logout as apiLogout,
} from "@/lib/api-client"

export default function VulnScanApp() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scans, setScans] = useState([])
  const [currentScan, setCurrentScan] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check for saved authentication
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      loadUserScans();

    }
    setIsAuthenticating(false);

    // Theme initialization
    const savedTheme = localStorage.getItem("vulnscan-theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = savedTheme ? savedTheme === "dark" : prefersDark
    setIsDarkMode(isDark)
    updateTheme(isDark)

    // Load scan history from localStorage
    const savedScans = localStorage.getItem("vulnscan-history")
    if (savedScans) {
      try {
        setScans(JSON.parse(savedScans))
      } catch (e) {
        console.error("Failed to load scan history:", e)
      }
    }
  }, [])
const handleGoogleSuccess = async (credentialResponse) => {
  try {
    setIsAuthenticating(true);
    const data = await authenticateWithGoogle(credentialResponse.credential);
    
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Load user's scans from backend
    await loadUserScans();
    
    setIsAuthenticating(false);
  } catch (error) {
    console.error('Login failed:', error);
    alert('Authentication failed. Please try again.');
    setIsAuthenticating(false);
  }
};


  const loadUserScans = async () => {
  try {
    console.log('📊 Loading user scans from backend...');
    const response = await fetch('http://localhost:8000/api/v1/scans', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to load scans');
      return;
    }
    
    const data = await response.json();
    console.log('✅ Loaded scans:', data);
    
    // Transform backend scans to frontend format
    const transformedScans = data.scans.map(scan => ({
      id: scan.scan_id,
      modelName: scan.model_name || 'Unknown Model',
      timestamp: new Date(scan.created_at).toLocaleString(),
      vulnerable: scan.results_count > 0, // You might want better logic here
      confidence: 0.85, // Placeholder - get from results if available
      attackType: scan.attack_type || 'FGSM',
      epsilon: 0.3 // Placeholder
    }));
    
    setScans(transformedScans);
    localStorage.setItem("vulnscan-history", JSON.stringify(transformedScans));
    
  } catch (error) {
    console.error('Error loading scans:', error);
  }
};

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    setToken(null);
    setScans([]);
    setCurrentScan(null);
    setCurrentPage("dashboard");
  };

  const updateTheme = (isDark) => {
    const html = document.documentElement
    if (isDark) {
      html.classList.add("dark")
    } else {
      html.classList.remove("dark")
    }
    localStorage.setItem("vulnscan-theme", isDark ? "dark" : "light")
  }

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    updateTheme(newTheme)
  }

  // Login Screen
  if (isAuthenticating) {
    return (
      <div className={isDarkMode ? "dark" : ""}>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

if (!user) {
    return (
      <div className={isDarkMode ? "dark" : ""}>
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Login Card */}
          <div className="relative z-10 w-full max-w-md">
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Header Section */}
              <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 px-8 pt-12 pb-8 text-center border-b border-border">
                <div className="mb-6 flex justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Shield className="w-11 h-11 text-primary-foreground" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">VulnScan</h1>
                <p className="text-muted-foreground text-base font-medium mb-1">AI Model Vulnerability Scanner</p>
                <p className="text-muted-foreground/70 text-sm">
                  Test your PyTorch models against adversarial attacks
                </p>
              </div>

              {/* Login Section */}
              <div className="px-8 py-10">
                <div className="space-y-6">
                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>Upload and analyze PyTorch models</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span>Run FGSM and PGD attack simulations</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>Track scan history and vulnerabilities</span>
                    </div>
                  </div>

                  {/* Google Login Button */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full flex justify-center">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => alert('Login Failed')}
                        theme={isDarkMode ? "filled_black" : "outline"}
                        size="large"
                        text="signin_with"
                        shape="rectangular"
                        width="280"
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      By signing in, you agree to securely store your scan data and model analysis results
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Section */}
              <div className="px-8 pb-8 pt-4 border-t border-border bg-secondary/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Secure • Encrypted • Private
                  </p>
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    aria-label="Toggle theme"
                  >
                    {isDarkMode ? (
                      <Sun className="w-4 h-4 text-accent" />
                    ) : (
                      <Moon className="w-4 h-4 text-primary" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Powered by advanced adversarial attack detection algorithms
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const stats = {
    totalScans: scans.length,
    vulnerabilitiesFound: scans.filter((s) => s.vulnerable).length,
    secureModels: scans.filter((s) => !s.vulnerable).length,
    avgConfidence: scans.length > 0 ? (scans.reduce((sum, s) => sum + s.confidence, 0) / scans.length) * 100 : 0,
  }

  const handleScanSubmit = async (modelName, files, attackType, epsilon) => {
    console.log('\n🎯 SCAN SUBMISSION STARTED');
    
    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Step 1: Upload model file
      console.log('📤 STEP 1: Uploading Model File');
      setUploadProgress(20);
      const modelFile = files[0];
      
      const modelResponse = await uploadModel(modelFile, modelName);
      console.log('✅ Model upload complete!');

      // Step 2: Upload test images
      console.log('📤 STEP 2: Uploading Test Images');
      setUploadProgress(40);
      const imageFiles = files.slice(1);
      
      if (imageFiles.length > 0) {
        await uploadTestData(imageFiles);
        console.log('✅ Test images upload complete!');
      }

      // Step 3: Run scan
      console.log('🔍 STEP 3: Running Scan');
      setUploadProgress(60);
      const scanResponse = await runScan(modelName, attackType, epsilon);
      console.log('✅ Scan initiated!');

      const scanId = scanResponse.data.scan_id;
      console.log('🆔 Scan ID:', scanId);

      if (!scanId) {
        throw new Error('No scan_id received from backend');
      }

      setUploadProgress(80);

      // Step 4: Retrieve results
      console.log('📊 STEP 4: Retrieving Scan Results');
      const scanResults = await getScanResults(scanId);
      console.log('✅ Results retrieved!');
      
      setUploadProgress(100);

      const isVulnerable = scanResults.results?.some((r) => r.attack_success) || false;

      const avgConfidence = scanResults.results?.length > 0
        ? scanResults.results.reduce((sum, r) => sum + (r.confidence_adversarial || 0), 0) / scanResults.results.length
        : 0;

      const newScan = {
        id: scanId,
        modelName,
        timestamp: new Date(scanResults.created_at || Date.now()).toLocaleString(),
        vulnerable: isVulnerable,
        confidence: avgConfidence,
        images: scanResults.results?.map((r) => r.adversarial_image_path || r.image_id) || [],
        epsilon,
        attackType,
        rawResults: scanResults,
      };

      const updatedScans = [newScan, ...scans];
      setScans(updatedScans);
      localStorage.setItem("vulnscan-history", JSON.stringify(updatedScans));
      
      setCurrentScan(newScan);
      setIsLoading(false);
      setCurrentPage("results");
      
      console.log('✅ SCAN COMPLETED SUCCESSFULLY!');
      
    } catch (err) {
      console.error('❌ SCAN FAILED!', err);
      
      const errorMessage = err.response?.data?.detail || err.message || "An error occurred during the scan";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const NavBar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage("dashboard")}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground hidden sm:inline">VulnScan</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => setCurrentPage("dashboard")}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                currentPage === "dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage("scan")}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                currentPage === "scan" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="w-4 h-4" />
              New Scan
            </button>
            <button
              onClick={() => setCurrentPage("history")}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                currentPage === "history" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="w-4 h-4" />
              History
            </button>
          </div>

          {/* Right side - User info, theme toggle and logout */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center gap-3">
              {user.picture && (
                <img 
                  src={user.picture} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full border-2 border-white/20"
                />
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-primary" />}
            </button>

            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-3">
            <button
              onClick={() => {
                setCurrentPage("dashboard")
                setIsMenuOpen(false)
              }}
              className="block text-left px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setCurrentPage("scan")
                setIsMenuOpen(false)
              }}
              className="block text-left px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              New Scan
            </button>
            <button
              onClick={() => {
                setCurrentPage("history")
                setIsMenuOpen(false)
              }}
              className="block text-left px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              History
            </button>
            <button
              onClick={handleLogout}
              className="block text-left px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors rounded"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )

  const Dashboard = () => (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your AI model security analysis</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="p-6 rounded-xl bg-card border border-border card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-2">Total Scans</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalScans}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-2">Vulnerabilities Found</p>
                <p className="text-3xl font-bold text-destructive">{stats.vulnerabilitiesFound}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-2">Secure Models</p>
                <p className="text-3xl font-bold text-success">{stats.secureModels}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-2">Avg Confidence</p>
                <p className="text-3xl font-bold text-accent">{stats.avgConfidence.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-accent" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Scans Table */}
        <div className="rounded-xl bg-card border border-border p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Recent Scans</h2>
          {scans.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No scans yet</p>
              <button
                onClick={() => setCurrentPage("scan")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-button font-medium hover:opacity-90 transition-opacity"
              >
                Start Your First Scan
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-muted-foreground">Model Name</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-muted-foreground">Timestamp</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-muted-foreground">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.slice(0, 5).map((scan) => (
                    <tr
                      key={scan.id}
                      className="border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setCurrentScan(scan)
                        setCurrentPage("results")
                      }}
                    >
                      <td className="px-4 py-4 text-sm text-foreground font-medium">{scan.modelName}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{scan.timestamp}</td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            scan.vulnerable ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                          }`}
                        >
                          {scan.vulnerable ? "Vulnerable" : "Secure"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground font-medium">
                        {(scan.confidence * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const ScanPage = () => {
    const [modelName, setModelName] = useState("")
    const [attackType, setAttackType] = useState("FGSM")
    const [epsilon, setEpsilon] = useState(0.3)
    const [files, setFiles] = useState([])
    const [modelFile, setModelFile] = useState(null)

    const handleSubmit = () => {
      if (modelName && modelFile && files.length > 0) {
        handleScanSubmit(modelName, [modelFile, ...files], attackType, epsilon)
      }
    }

    return (
      <div className="min-h-screen bg-background pt-20 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-2">New Scan</h1>
            <p className="text-muted-foreground">
              Upload your PyTorch model and test images for vulnerability analysis
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-destructive">Error</h3>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Step 1: Model Details */}
            <div className="rounded-xl bg-card border border-border p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  1
                </div>
                <h2 className="text-xl font-bold text-foreground">Model Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Model Name</label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g., ResNet50-ImageNet"
                    className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isLoading}
                  />
                </div>

                {/* Model File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">PyTorch Model</label>
                  <label className="flex items-center justify-center w-full px-4 py-8 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        {modelFile ? modelFile.name : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">(.pth or .pt files)</p>
                    </div>
                    <input
                      type="file"
                      accept=".pth,.pt"
                      onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Step 2: Test Images */}
            <div className="rounded-xl bg-card border border-border p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  2
                </div>
                <h2 className="text-xl font-bold text-foreground">Test Images</h2>
              </div>

              <label className="flex items-center justify-center w-full px-4 py-8 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {files.length > 0 ? `${files.length} images selected` : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">(PNG, JPG, or GIF)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>
            </div>

            {/* Step 3: Attack Configuration */}
            <div className="rounded-xl bg-card border border-border p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  3
                </div>
                <h2 className="text-xl font-bold text-foreground">Attack Configuration</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Attack Type</label>
                  <select
                    value={attackType}
                    onChange={(e) => setAttackType(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isLoading}
                  >
                    <option value="FGSM">FGSM - Fast Gradient Sign Method</option>
                    <option value="PGD">PGD - Projected Gradient Descent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Epsilon (Perturbation Strength): {epsilon.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                    value={epsilon}
                    onChange={(e) => setEpsilon(Number.parseFloat(e.target.value))}
                    className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer accent-primary"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-2">Lower values = more subtle perturbations</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {isLoading && (
              <div className="rounded-xl bg-card border border-border p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">Scanning in progress...</p>
                  <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</p>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !modelName || !modelFile || files.length === 0}
              className="w-full py-4 rounded-lg gradient-button font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  Start Vulnerability Scan
                  <Zap className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const ResultsPage = () => {
    if (!currentScan) return null

    return (
      <div className="min-h-screen bg-background pt-20 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-2">Scan Results</h1>
            <p className="text-muted-foreground">
              {currentScan.modelName} • {currentScan.timestamp}
            </p>
          </div>

          {/* Vulnerability Status */}
          <div
            className={`rounded-xl border p-8 mb-10 ${
              currentScan.vulnerable ? "bg-destructive/5 border-destructive/20" : "bg-success/5 border-success/20"
            }`}
          >
            <div className="flex items-start gap-4">
              {currentScan.vulnerable ? (
                <AlertCircle className="w-8 h-8 text-destructive mt-1 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-success mt-1 flex-shrink-0" />
              )}
              <div>
                <h2 className="text-2xl font-bold mb-2 text-foreground">
                  {currentScan.vulnerable ? "Vulnerability Detected" : "Model Secure"}
                </h2>
                <p className={`text-lg font-semibold ${currentScan.vulnerable ? "text-destructive" : "text-success"}`}>
                  {currentScan.vulnerable
                    ? `This model is vulnerable to ${currentScan.attackType} attacks`
                    : "No vulnerabilities detected in this scan"}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Results Table */}
          {currentScan.rawResults && currentScan.rawResults.results && (
            <div className="rounded-xl bg-card border border-border p-6 mb-10">
              <h3 className="text-xl font-bold text-foreground mb-6">Detailed Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-sm font-semibold text-muted-foreground">Image</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-muted-foreground">Original</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-muted-foreground">Adversarial</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-muted-foreground">Perturbation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentScan.rawResults.results.map((result, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-4 text-sm text-foreground font-medium">Image {idx + 1}</td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{result.original_prediction}</td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{result.adversarial_prediction}</td>
                        <td className="px-4 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              result.attack_success ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                            }`}
                          >
                            {result.attack_success ? "Vulnerable" : "Secure"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-foreground">
                          {result.perturbation_norm?.toFixed(4) || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="rounded-xl bg-card border border-border p-6">
              <p className="text-muted-foreground text-sm font-medium mb-2">Attack Type</p>
              <p className="text-2xl font-bold text-primary">{currentScan.attackType}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-6">
              <p className="text-muted-foreground text-sm font-medium mb-2">Epsilon (Perturbation)</p>
              <p className="text-2xl font-bold text-accent">{currentScan.epsilon.toFixed(3)}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-6">
              <p className="text-muted-foreground text-sm font-medium mb-2">Confidence Score</p>
              <p className="text-2xl font-bold text-foreground">{(currentScan.confidence * 100).toFixed(1)}%</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 flex-col sm:flex-row">
            <button
              onClick={() => setCurrentPage("scan")}
              className="flex-1 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-secondary transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              New Scan
            </button>
            <button
              onClick={() => setCurrentPage("dashboard")}
              className="flex-1 py-3 rounded-lg gradient-button font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const HistoryPage = () => (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">Scan History</h1>
          <p className="text-muted-foreground">All your vulnerability scans and results</p>
        </div>

        {/* History List */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {scans.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No scan history yet</p>
              <button
                onClick={() => setCurrentPage("scan")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-button font-medium hover:opacity-90 transition-opacity"
              >
                Start Your First Scan
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Model Name</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Attack Type</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Timestamp</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Confidence</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr key={scan.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{scan.modelName}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{scan.attackType}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{scan.timestamp}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                            scan.vulnerable ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                          }`}
                        >
                          {scan.vulnerable ? "Vulnerable" : "Secure"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {(scan.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => {
                            setCurrentScan(scan)
                            setCurrentPage("results")
                          }}
                          className="text-primary hover:text-accent font-medium transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <NavBar />

      {currentPage === "dashboard" && <Dashboard />}
      {currentPage === "scan" && <ScanPage />}
      {currentPage === "results" && <ResultsPage />}
      {currentPage === "history" && <HistoryPage />}
    </div>
  )
}