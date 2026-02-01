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
    History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { getUserProfile, logout } from "@/lib/auth";
import { ProfileSkeleton } from "@/components/ui/skeleton-loaders";

const Profile = () => {
    const navigate = useNavigate();
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
                console.error("Error fetching user profile:", error);
                // Fallback to localStorage on error
                const userData = localStorage.getItem("user_data");
                if (userData) {
                    try {
                        const parsedUser = JSON.parse(userData);
                        setUser(parsedUser);
                    } catch (parseError) {
                        console.error("Error parsing user data:", parseError);
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
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <div className="container mx-auto px-4 pt-6">
                <div className="mb-6">
                    <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-full gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Left Column - User Overview */}
                    <div className="lg:col-span-1">
                        <Card className="p-6 text-center shadow-card border-border/60 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-primary opacity-20"></div>

                            <div className="relative mt-4 mb-6">
                                <div className="mx-auto w-24 h-24 rounded-full border-4 border-background bg-primary-light flex items-center justify-center text-primary overflow-hidden">
                                    {user.imageId?.key ? (
                                        <img src={`${user.imageId.baseUrl}${user.imageId.key}`} alt={user.firstName} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="h-12 w-12" />
                                    )}
                                </div>
                                <Badge className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 bg-emerald-500 text-white border-2 border-background">
                                    {user.status || "Active"}
                                </Badge>
                            </div>

                            <h2 className="text-2xl font-bold text-foreground mb-1">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "User"}</h2>
                            <p className="text-sm text-muted-foreground mb-6">{user.email || "No email provided"}</p>

                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-4 w-4" />
                                    Log Out
                                </Button>
                            </div>
                        </Card>

                        {/* Stats/Badges */}
                        <Card className="mt-8 p-6 shadow-card border-border/60">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Academic Progress</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-2xl bg-primary-light text-center">
                                    <div className="text-xl font-bold text-primary">{user.profileId?.exams?.length || 0}</div>
                                    <div className="text-[10px] text-primary/70 uppercase">Exams</div>
                                </div>
                                <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-center">
                                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{user.profileId?.totalRewards || 0}</div>
                                    <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase">Rewards</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column - User Details */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="p-8 shadow-card border-border/60">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Personal Information
                            </h3>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <User className="h-3 w-3" /> Full Name
                                    </label>
                                    <p className="font-medium text-foreground">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "N/A"}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Phone className="h-3 w-3" /> Mobile Number
                                    </label>
                                    <p className="font-medium text-foreground">{user.primaryNumber ? `${user.countryCode || "+91"} ${user.primaryNumber}` : "N/A"}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Mail className="h-3 w-3" /> Email Address
                                    </label>
                                    <p className="font-medium text-foreground">{user.email || "N/A"}</p>
                                </div>

                            </div>
                        </Card>

                        <Card className="p-8 shadow-card border-border/60">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-primary" />
                                Academic Details
                            </h3>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Layers className="h-3 w-3" /> Class
                                    </label>
                                    <p className="font-medium text-foreground">{user.profileId?.class || "N/A"}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <BookOpen className="h-3 w-3" /> Board
                                    </label>
                                    <p className="font-medium text-foreground">{user.profileId?.board || "N/A"}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <ShieldCheck className="h-3 w-3" /> Goal/Exam
                                    </label>
                                    <p className="font-medium text-foreground">{user.profileId?.exams?.join(", ") || "N/A"}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-3 w-3" /> Date of Birth
                                    </label>
                                    <p className="font-medium text-foreground">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "Not specified"}</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 shadow-card border-border/60">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary" />
                                Wallet & Subscription
                            </h3>

                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                <div className="p-4 rounded-2xl bg-muted/40 border border-border/40">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Total Coins</label>
                                    <div className="text-2xl font-bold text-amber-600">{user.profileId?.coins?.totalCoins || 0}</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-muted/40 border border-border/40">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Wallet Balance</label>
                                    <div className="text-2xl font-bold text-emerald-600">₹{user.profileId?.wallet || 0}</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-muted/40 border border-border/40">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Member Since</label>
                                    <div className="text-lg font-bold text-foreground">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
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
