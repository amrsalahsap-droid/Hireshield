export default async function CandidatesPage() {
  // Mock data for now - will be replaced with real API calls
  const candidates = [
    {
      id: "1",
      fullName: "Alice Johnson",
      email: "alice.johnson@example.com",
      createdAt: "2024-01-15T10:30:00Z",
      interviews: 3,
      status: "Active"
    },
    {
      id: "2", 
      fullName: "Bob Wilson",
      email: "bob.wilson@example.com",
      createdAt: "2024-01-14T15:45:00Z",
      interviews: 2,
      status: "Screening"
    },
    {
      id: "3",
      fullName: "Carol Davis", 
      email: "carol.davis@example.com",
      createdAt: "2024-01-13T09:20:00Z",
      interviews: 1,
      status: "Active"
    },
    {
      id: "4",
      fullName: "David Martinez",
      email: "david.martinez@example.com", 
      createdAt: "2024-01-10T14:15:00Z",
      interviews: 0,
      status: "New"
    },
    {
      id: "5",
      fullName: "Eva Chen",
      email: null,
      createdAt: "2024-01-08T11:30:00Z",
      interviews: 4,
      status: "Active"
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800";
      case "Screening": return "bg-blue-100 text-blue-800";
      case "New": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            Add Candidate
          </button>
        </div>
        <p className="text-gray-600">
          Track and manage your candidate pipeline.
        </p>
      </div>

      {/* Candidates Grid */}
      <div className="bg-white shadow overflow-hidden rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interviews
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-600">
                            {candidate.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {candidate.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {candidate.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(candidate.status)}`}>
                      {candidate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {candidate.interviews}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(candidate.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                      View
                    </button>
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
