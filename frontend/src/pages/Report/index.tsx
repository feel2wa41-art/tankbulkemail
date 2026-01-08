export default function Report() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Report</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4 mb-4">
          <select className="border rounded-md px-3 py-2">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <select className="border rounded-md px-3 py-2">
            <option>All Organizations</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Send Summary</h2>
          <p className="text-gray-500">No data available</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Domain Statistics</h2>
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    </div>
  );
}
