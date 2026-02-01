import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    User,
    Mail,
    Phone,
    LogOut,
    ArrowLeft,
    ShieldCheck,
    Calendar,
    MapPin,
    Award,
    CreditCard,
    History,
    FileText,
    Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { getUserProfile, logout } from "@/lib/auth";
import { ProfileSkeleton } from "@/components/ui/skeleton-loaders";
import TermsAndPrivacy from "@/components/profile/TermsAndPrivacy";

const Profile = () => {
    const navigate = useNavigate();
    const [showTerms, setShowTerms] = useState(false);
    const [user, setUser] = useState<any>(() => {
        try {
            const saved = localStorage.getItem("user_data");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(!user);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem("param_auth_token");
                if (!token) {
                    navigate("/login");
                    return;
                }

                // Fetch fresh user data from API
                const response = await getUserProfile(token);
                if (response?.data?.data) {
                    const freshUserData = response.data.data;
                    setUser(freshUserData);
                    // Update localStorage with fresh data
                    localStorage.setItem("user_data", JSON.stringify(freshUserData));
                } else {
                    // Fallback to localStorage if API fails
                    const userData = localStorage.getItem("user_data");
                    if (userData) {
                        const parsedUser = JSON.parse(userData);
                        setUser(parsedUser);
                    }
                }
            } catch (error) {
                // Fallback to localStorage on error
                const userData = localStorage.getItem("user_data");
                if (userData) {
                    try {
                        const parsedUser = JSON.parse(userData);
                        setUser(parsedUser);
                    } catch (parseError) {
                        // Error parsing user data
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [navigate]);


    const handleLogout = () => {
        logout();
        toast.success("Logged out successfully");
        navigate("/login");
    };

    const handleBack = () => {
        navigate(-1);
    };

    if (loading) {
        return <ProfileSkeleton />;
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 py-20 text-center">
                    <Card className="max-w-md mx-auto p-8 shadow-card">
                        <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Not Logged In</h2>
                        <p className="text-muted-foreground mb-6">Please log in to view your profile.</p>
                        <Button onClick={() => navigate("/login")} className="w-full bg-gradient-primary">
                            Go to Login
                        </Button>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        showTerms ? (
            <TermsAndPrivacy onBack={() => setShowTerms(false)} />
        ) : (
            <div className="min-h-screen bg-background pb-12 sm:pb-16 lg:pb-20">
                <Navbar />

                <div className="container mx-auto px-2 sm:px-3 md:px-4 lg:px-4 pt-3 sm:pt-4 lg:pt-6">
                    <div className="mb-4 sm:mb-6">
                        <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-full gap-2 text-sm">
                            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                            Back
                        </Button>
                    </div>

                <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-3">
                    {/* Left Column - User Overview */}
                    <div className="lg:col-span-1 order-1 lg:order-1">
                        <Card className="p-3 sm:p-4 md:p-6 text-center shadow-card border-border/60 overflow-hidden relative hover:shadow-lg transition-shadow duration-300">
                            <div className="absolute top-0 left-0 w-full h-16 sm:h-20 lg:h-24 bg-gradient-to-br from-primary/10 to-primary/5"></div>

                            <div className="relative mt-2 mb-3 sm:mt-3 sm:mb-4 lg:mt-4 lg:mb-6">
                                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full border-4 border-background bg-gradient-to-br from-primary-light to-primary/20 flex items-center justify-center text-primary overflow-hidden shadow-lg">
                                    {user.imageId?.key ? (
                                        <img src={`${user.imageId.baseUrl}${user.imageId.key}`} alt={user.firstName} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12" />
                                    )}
                                </div>
                                <Badge className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-2 border-background shadow-md text-xs">
                                    {user.status || "Active"}
                                </Badge>
                            </div>

                            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-1 tracking-tight">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "User"}</h2>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 lg:mb-6 font-medium break-words">{user.email || "No email provided"}</p>

                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200 hover:scale-[1.02] text-sm sm:text-base"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-4 w-4" />
                                    Log Out
                                </Button>
                            </div>
                        </Card>

                        {/* Stats/Badges */}
                        <Card className="mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 md:p-6 shadow-card border-border/60 hover:shadow-lg transition-shadow duration-300">
                            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4 flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-primary"></div>
                                Academic Progress
                            </h3>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                                <div className="p-2 sm:p-2 lg:p-3 rounded-2xl bg-gradient-to-br from-primary-light to-primary/10 text-center border border-primary/20 hover:border-primary/30 transition-colors duration-200">
                                    <div className="text-base sm:text-lg lg:text-xl font-bold text-primary">{user.profileId?.exams?.length || 0}</div>
                                    <div className="text-[8px] sm:text-[9px] lg:text-[10px] text-primary/70 uppercase font-medium">Exams</div>
                                </div>
                                <div className="p-2 sm:p-2 lg:p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 text-center border border-emerald-200 dark:border-emerald-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors duration-200">
                                    <div className="text-base sm:text-lg lg:text-xl font-bold text-emerald-600 dark:text-emerald-400">{user.profileId?.totalRewards || 0}</div>
                                    <div className="text-[8px] sm:text-[9px] lg:text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase font-medium">Rewards</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column - User Details */}
                    <div className="lg:col-span-2 order-2 lg:order-2 space-y-4 sm:space-y-6 lg:space-y-8">
                        <Card className="p-3 sm:p-4 md:p-6 lg:p-8 shadow-card border-border/60 hover:shadow-lg transition-shadow duration-300">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 lg:mb-6 flex items-center gap-2">
                                <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
                                    <User className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-primary" />
                                </div>
                                Personal Information
                            </h3>

                            <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2">
                                <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
                                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1 sm:gap-2 uppercase tracking-wider">
                                        <User className="h-3 w-3" /> Full Name
                                    </label>
                                    <p className="text-sm sm:font-medium font-medium text-foreground">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "N/A"}</p>
                                </div>

                                <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
                                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1 sm:gap-2 uppercase tracking-wider">
                                        <Phone className="h-3 w-3" /> Mobile Number
                                    </label>
                                    <p className="text-sm sm:font-medium font-medium text-foreground">{user.primaryNumber ? `${user.countryCode || "+91"} ${user.primaryNumber}` : "N/A"}</p>
                                </div>

                                <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
                                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1 sm:gap-2 uppercase tracking-wider">
                                        <Mail className="h-3 w-3" /> Email Address
                                    </label>
                                    <p className="text-sm sm:font-medium font-medium text-foreground">{user.email || "N/A"}</p>
                                </div>


                            </div>
                        </Card>

                        <Card className="p-3 sm:p-4 md:p-6 lg:p-8 shadow-card border-border/60 hover:shadow-lg transition-shadow duration-300">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 lg:mb-6 flex items-center gap-2">
                                <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
                                    <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-primary" />
                                </div>
                                Academic Details
                            </h3>

                            <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2">
                                <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
                                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1 sm:gap-2 uppercase tracking-wider">
                                        <Layers className="h-3 w-3" /> Class
                                    </label>
                                    <p className="text-sm sm:font-medium font-medium text-foreground">{user.profileId?.class || "N/A"}</p>
                                </div>

                                <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
                                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1 sm:gap-2 uppercase tracking-wider">
                                        <BookOpen className="h-3 w-3" /> Board
                                    </label>
                                    <p className="text-sm sm:font-medium font-medium text-foreground">{user.profileId?.board || "N/A"}</p>
                                </div>

                                <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
                                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1 sm:gap-2 uppercase tracking-wider">
                                        <ShieldCheck className="h-3 w-3" /> Goal/Exam
                                    </label>
                                    <p className="text-sm sm:font-medium font-medium text-foreground">{user.profileId?.exams?.join(", ") || "N/A"}</p>
                                </div>

                                <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
                                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1 sm:gap-2 uppercase tracking-wider">
                                        <Calendar className="h-3 w-3" /> Date of Birth
                                    </label>
                                    <p className="text-sm sm:font-medium font-medium text-foreground">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "Not specified"}</p>
                                </div>
                            </div>
                        </Card>

                        {/* Terms & Privacy Card */}
                        <Card className="p-3 sm:p-4 md:p-6 lg:p-8 shadow-card border-border/60 hover:shadow-lg transition-shadow duration-300">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 lg:mb-6 flex items-center gap-2">
                                <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
                                    <Shield className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-primary" />
                                </div>
                                Legal & Privacy
                            </h3>

                            <div className="space-y-3 sm:space-y-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowTerms(true)}
                                    className="w-full flex items-center justify-between p-2 sm:p-3 lg:p-4 h-auto hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 hover:scale-[1.01]"
                                >
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="flex h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/20">
                                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-primary" />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="text-xs sm:text-sm font-medium text-foreground break-words">Terms & Privacy Policy</div>
                                            <div className="text-xs text-muted-foreground break-words max-w-full">View our terms of service and privacy policy</div>
                                        </div>
                                    </div>
                                    <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 rotate-180" />
                                </Button>
                            </div>
                        </Card>

                        <Card className="p-3 sm:p-4 md:p-6 lg:p-8 shadow-card border-border/60 hover:shadow-lg transition-shadow duration-300">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 lg:mb-6 flex items-center gap-2">
                                <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
                                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-primary" />
                                </div>
                                Wallet & Subscription
                            </h3>

                            <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="p-2 sm:p-3 lg:p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-200 dark:border-amber-700 hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-200">
                                    <label className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Total Coins</label>
                                    <div className="text-base sm:text-lg lg:text-2xl font-bold text-amber-600">{user.profileId?.coins?.totalCoins || 0}</div>
                                </div>
                                <div className="p-2 sm:p-3 lg:p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-200 dark:border-emerald-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200">
                                    <label className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Wallet Balance</label>
                                    <div className="text-base sm:text-lg lg:text-2xl font-bold text-emerald-600">₹{user.profileId?.wallet || 0}</div>
                                </div>
                                <div className="p-2 sm:p-3 lg:p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/40 hover:border-border/60 transition-all duration-200 sm:col-span-2 lg:col-span-1">
                                    <label className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Member Since</label>
                                    <div className="text-xs sm:text-sm lg:text-lg font-bold text-foreground">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
        )
    );
};

// Re-using Lucide components for internal consistency
const GraduationCap = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
);

const Layers = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
);

const BookOpen = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h6z" /></svg>
);

export default Profile;
