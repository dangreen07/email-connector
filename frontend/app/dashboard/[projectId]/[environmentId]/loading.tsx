export default function EnvironmentDashboardLoading() {
    return (
        <div className="flex items-center justify-center flex-grow min-h-[calc(100vh-15rem)]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
    );
}