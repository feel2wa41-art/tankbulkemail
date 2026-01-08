export default function Automation() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Automation</h1>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
          + New Automation
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex gap-4">
            <select className="border rounded-md px-3 py-2">
              <option>All Organizations</option>
            </select>
            <input
              type="search"
              placeholder="Search automations..."
              className="border rounded-md px-3 py-2 flex-1"
            />
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-500 text-center">No automations found</p>
        </div>
      </div>
    </div>
  );
}
