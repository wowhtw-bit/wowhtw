'use client';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            커뮤니티 대시보드
          </h1>
          
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">
              Raw 데이터를 기반으로 한 차트 대시보드가 여기에 표시됩니다.
            </p>
            <p className="text-gray-500 text-sm">
              차트 기능은 곧 추가될 예정입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
