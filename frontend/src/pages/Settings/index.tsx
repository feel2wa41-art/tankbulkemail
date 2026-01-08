export default function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Organizations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Organizations</h2>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
            + Add Organization
          </button>
          <div className="mt-4">
            <p className="text-gray-500">No organizations found</p>
          </div>
        </div>

        {/* DB Profiles */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Database Profiles</h2>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
            + Add DB Profile
          </button>
          <div className="mt-4">
            <p className="text-gray-500">No database profiles found</p>
          </div>
        </div>

        {/* SES Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">AWS SES Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Region</label>
              <input
                type="text"
                className="border rounded-md px-3 py-2 w-full max-w-md"
                placeholder="ap-northeast-2"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                Sandbox Mode
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
