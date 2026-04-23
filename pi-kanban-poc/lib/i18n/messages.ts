import type { UiLocale } from '@/types/domain'

export type MessageDictionary = typeof messages.en

export const messages = {
  en: {
    nav: { projects: 'Projects', directory: 'Directory', timeline: 'Timeline', insights: 'Insights', notifications: 'Notifications', language: 'Language', aiContext: 'Personal AI Context' },
    common: { cancel: 'Cancel', save: 'Save', close: 'Close', search: 'Search...', markDone: 'Mark done', nothingPending: 'Nothing pending', everythingClear: 'Everything clear' },
    dashboard: {
      heroBadge: 'Powered by AI agents',
      titlePrefix: 'Hi! What shall we', titleAccent: 'create', titleSuffix: 'today?',
      subtitle: 'Organize, plan, and execute your projects with a team of specialized AI agents.',
      method1: 'Method 01', method2: 'Method 02', newProject: 'New Project', startFromDocuments: 'Start From Documents',
      createJourney: 'Initiate a new project journey', createJourneyDescription: 'Start from a simple idea or import documents to let AI build your execution blueprint.',
      aiAgentsReady: 'AI Agents Ready', aiAgentsReadyDescription: 'Our collective of specialized agents is standing by to help you strategize and automate your workflow instantly.',
      systemsOnline: 'Systems online', projectHistory: 'Project History', recentJourneys: 'Your recent journeys', ready: 'Ready',
      journeysEmptyTitle: 'Your journeys will appear here', journeysEmptyDescription: 'Start a new project and let AI help you plan and execute it.',
      projectsCount: (count: number) => `${count} projects`,
    },
    playbook: { label: 'Playbook' },
    createProject: {
      importTitle: 'Import a project brief', newTitle: 'What are you planning?', importDescription: "Pick a file and we'll turn it into a planning workspace.", newDescription: "Give it a name. We'll figure out the rest together.",
      namePlaceholder: 'E.g. Spring wedding, Q2 product launch, 6-month SaaS MVP…', creating: 'Creating…', uploadAndStart: 'Upload & start', startPlanning: 'Start planning', aiPlanning: 'AI-powered planning',
    },
    importFlow: {
      title: 'Import a project brief', pickSource: 'Pick source', reviewExtraction: 'Review extraction', nameAndStart: 'Name & start',
      readingFiles: 'Reading your files…', dropFiles: 'Drop files here or click to browse', supportedFiles: 'PDF, Word, Excel, CSV, text, images · up to 5 files',
      orPaste: 'Or paste text', pastePlaceholder: 'Paste the project brief, an email, meeting notes, or any starting context…', usePastedText: 'Use pasted text',
      reviewIntro: 'We extracted the following from your import. Verify before continuing.', previewExtractedText: 'Preview extracted text', removeFile: 'Remove file',
      importWarning: 'This file needs a vision-capable AI model to be interpreted. It will still be attached as a reference.',
    },
    planning: {
      status: 'Status', sources: 'Sources', workflowNotes: 'Workflow Notes', timeline: 'Timeline', history: 'History',
      currentPhase: 'Current phase', pendingApprovals: 'Pending approvals', latestEvent: 'Latest event', attentionItems: 'Attention items', aiRuntime: 'AI runtime',
      noPlanningMilestones: 'No planning milestones yet', noActionRecorded: 'No action recorded yet', currentPlanningAndRuntime: 'Current planning and runtime state', importedSources: 'Imported Sources', workflowNotesDescription: 'Rules, validation, and live project notes', planningTimeline: 'Planning Timeline', recentPlanningEvents: 'Recent planning events',
      all: 'all', sourcesFilter: 'sources', revisions: 'revisions', tasks: 'tasks', planningMilestonesEvolve: 'Planning milestones will appear here as the project evolves.',
      savedUserContext: 'Saved user context', needsAttention: 'Needs attention',
    },
    personalAI: {
      title: 'Personal AI Context', subtitle: 'These preferences are reused across projects so planning can feel more consistent.', preferredLanguage: 'Preferred language', responseStyle: 'Response style', planningFormat: 'Planning format', workingNotes: 'Working notes for the AI', notePlaceholder: 'Examples: Use Vietnamese by default. Keep outputs structured and easy to scan. Prefer action items with clear owners and deadlines.', english: 'English', vietnamese: 'Vietnamese', bilingual: 'Bilingual', concise: 'Concise', balanced: 'Balanced', detailed: 'Detailed', bulletsFirst: 'Bullets first', structuredDoc: 'Structured document', actionFirst: 'Action first', savePreferences: 'Save preferences',
    },
    mission: {
      runtime: 'Runtime', totalTasks: 'Total Tasks', inExecution: 'In Execution', completed: 'Completed', archived: 'Archived', agents: 'Agents', closeMission: 'Close Mission', aiProcessing: 'AI Processing', newTask: 'New Task',
    },
    locale: { en: 'English', vi: 'Tiếng Việt', th: 'ไทย', ko: '한국어', ja: '日本語' },
  },
  vi: {
    nav: { projects: 'Dự án', directory: 'Thư mục', timeline: 'Dòng thời gian', insights: 'Phân tích', notifications: 'Thông báo', language: 'Ngôn ngữ', aiContext: 'Ngữ cảnh AI cá nhân' },
    common: { cancel: 'Hủy', save: 'Lưu', close: 'Đóng', search: 'Tìm kiếm...', markDone: 'Đánh dấu xong', nothingPending: 'Không có gì chờ xử lý', everythingClear: 'Mọi thứ ổn' },
    dashboard: {
      heroBadge: 'Vận hành bởi AI agents',
      titlePrefix: 'Hôm nay bạn muốn', titleAccent: 'tạo', titleSuffix: 'gì?',
      subtitle: 'Tổ chức, lên kế hoạch và thực thi dự án với đội ngũ AI chuyên biệt.',
      method1: 'Cách 01', method2: 'Cách 02', newProject: 'Dự án mới', startFromDocuments: 'Bắt đầu từ tài liệu',
      createJourney: 'Khởi tạo một hành trình dự án mới', createJourneyDescription: 'Bắt đầu từ một ý tưởng đơn giản hoặc import tài liệu để AI dựng execution blueprint cho bạn.',
      aiAgentsReady: 'AI Agents sẵn sàng', aiAgentsReadyDescription: 'Nhóm AI chuyên biệt đã sẵn sàng giúp bạn lên chiến lược và tự động hóa workflow ngay lập tức.',
      systemsOnline: 'Hệ thống đang hoạt động', projectHistory: 'Lịch sử dự án', recentJourneys: 'Các hành trình gần đây', ready: 'Sẵn sàng',
      journeysEmptyTitle: 'Hành trình của bạn sẽ xuất hiện ở đây', journeysEmptyDescription: 'Bắt đầu một dự án mới và để AI giúp bạn lên kế hoạch và thực thi.',
      projectsCount: (count: number) => `${count} dự án`,
    },
    playbook: { label: 'Playbook' },
    createProject: {
      importTitle: 'Import brief dự án', newTitle: 'Bạn đang muốn lên kế hoạch cho gì?', importDescription: 'Chọn file và chúng tôi sẽ biến nó thành workspace planning.', newDescription: 'Đặt tên trước. Phần còn lại AI sẽ cùng bạn làm rõ.',
      namePlaceholder: 'Ví dụ: Đám cưới mùa xuân, launch sản phẩm Q2, MVP SaaS 6 tháng…', creating: 'Đang tạo…', uploadAndStart: 'Tải lên & bắt đầu', startPlanning: 'Bắt đầu planning', aiPlanning: 'Planning với AI',
    },
    importFlow: {
      title: 'Import brief dự án', pickSource: 'Chọn nguồn', reviewExtraction: 'Xem trích xuất', nameAndStart: 'Đặt tên & bắt đầu',
      readingFiles: 'Đang đọc file của bạn…', dropFiles: 'Thả file vào đây hoặc bấm để chọn', supportedFiles: 'PDF, Word, Excel, CSV, text, ảnh · tối đa 5 file',
      orPaste: 'Hoặc dán nội dung', pastePlaceholder: 'Dán brief dự án, email, ghi chú họp hoặc bất kỳ context khởi đầu nào…', usePastedText: 'Dùng nội dung đã dán',
      reviewIntro: 'Chúng tôi đã trích xuất các nội dung sau từ phần import. Hãy kiểm tra trước khi tiếp tục.', previewExtractedText: 'Xem trước nội dung trích xuất', removeFile: 'Xóa file',
      importWarning: 'File này cần model AI có vision để hiểu. Nó vẫn sẽ được gắn vào như một nguồn tham chiếu.',
    },
    planning: {
      status: 'Trạng thái', sources: 'Nguồn', workflowNotes: 'Ghi chú workflow', timeline: 'Dòng thời gian', history: 'Lịch sử',
      currentPhase: 'Giai đoạn hiện tại', pendingApprovals: 'Phê duyệt đang chờ', latestEvent: 'Sự kiện mới nhất', attentionItems: 'Mục cần chú ý', aiRuntime: 'Runtime AI',
      noPlanningMilestones: 'Chưa có mốc planning nào', noActionRecorded: 'Chưa có hành động nào được ghi lại', currentPlanningAndRuntime: 'Trạng thái planning và runtime hiện tại', importedSources: 'Nguồn đã import', workflowNotesDescription: 'Quy tắc, validation và ghi chú vận hành', planningTimeline: 'Dòng thời gian planning', recentPlanningEvents: 'Các sự kiện planning gần đây',
      all: 'tất cả', sourcesFilter: 'nguồn', revisions: 'bản sửa', tasks: 'task', planningMilestonesEvolve: 'Các mốc planning sẽ xuất hiện ở đây khi dự án phát triển.',
      savedUserContext: 'Ngữ cảnh người dùng đã lưu', needsAttention: 'Cần chú ý',
    },
    personalAI: {
      title: 'Ngữ cảnh AI cá nhân', subtitle: 'Các tuỳ chọn này sẽ được dùng lại giữa nhiều project để planning nhất quán hơn.', preferredLanguage: 'Ngôn ngữ ưu tiên', responseStyle: 'Phong cách phản hồi', planningFormat: 'Định dạng planning', workingNotes: 'Ghi chú làm việc cho AI', notePlaceholder: 'Ví dụ: Dùng tiếng Việt mặc định. Giữ output có cấu trúc và dễ scan. Ưu tiên action items rõ owner và deadline.', english: 'Tiếng Anh', vietnamese: 'Tiếng Việt', bilingual: 'Song ngữ', concise: 'Ngắn gọn', balanced: 'Cân bằng', detailed: 'Chi tiết', bulletsFirst: 'Ưu tiên bullet', structuredDoc: 'Tài liệu có cấu trúc', actionFirst: 'Ưu tiên hành động', savePreferences: 'Lưu tuỳ chọn',
    },
    mission: {
      runtime: 'Runtime', totalTasks: 'Tổng task', inExecution: 'Đang thực thi', completed: 'Hoàn thành', archived: 'Lưu trữ', agents: 'Agents', closeMission: 'Đóng mission', aiProcessing: 'AI đang xử lý', newTask: 'Task mới',
    },
    locale: { en: 'English', vi: 'Tiếng Việt', th: 'ไทย', ko: '한국어', ja: '日本語' },
  },
  th: {
    nav: { projects: 'โปรเจกต์', directory: 'ไดเรกทอรี', timeline: 'ไทม์ไลน์', insights: 'ข้อมูลเชิงลึก', notifications: 'การแจ้งเตือน', language: 'ภาษา', aiContext: 'บริบท AI ส่วนตัว' },
    common: { cancel: 'ยกเลิก', save: 'บันทึก', close: 'ปิด', search: 'ค้นหา...', markDone: 'ทำเครื่องหมายว่าเสร็จ', nothingPending: 'ไม่มีสิ่งที่ค้างอยู่', everythingClear: 'ทุกอย่างเรียบร้อย' },
    dashboard: { heroBadge: 'ขับเคลื่อนด้วย AI agents', titlePrefix: 'วันนี้คุณอยาก', titleAccent: 'สร้าง', titleSuffix: 'อะไร?', subtitle: 'จัดระเบียบ วางแผน และดำเนินโปรเจกต์ด้วยทีม AI เฉพาะทาง', method1: 'วิธี 01', method2: 'วิธี 02', newProject: 'โปรเจกต์ใหม่', startFromDocuments: 'เริ่มจากเอกสาร', createJourney: 'เริ่มต้นเส้นทางโปรเจกต์ใหม่', createJourneyDescription: 'เริ่มจากไอเดียง่ายๆ หรือ import เอกสารเพื่อให้ AI สร้าง execution blueprint ให้', aiAgentsReady: 'AI Agents พร้อมแล้ว', aiAgentsReadyDescription: 'กลุ่ม AI เฉพาะทางพร้อมช่วยคุณวางกลยุทธ์และทำ workflow ให้เป็นอัตโนมัติทันที', systemsOnline: 'ระบบออนไลน์', projectHistory: 'ประวัติโปรเจกต์', recentJourneys: 'เส้นทางล่าสุดของคุณ', ready: 'พร้อม', journeysEmptyTitle: 'เส้นทางของคุณจะแสดงที่นี่', journeysEmptyDescription: 'เริ่มโปรเจกต์ใหม่และให้ AI ช่วยวางแผนและลงมือทำ', projectsCount: (count: number) => `${count} โปรเจกต์` },
    playbook: { label: 'เพลย์บุ๊ก' },
    createProject: { importTitle: 'นำเข้าโปรเจกต์บรีฟ', newTitle: 'คุณกำลังวางแผนเรื่องอะไร?', importDescription: 'เลือกไฟล์แล้วเราจะเปลี่ยนให้เป็น planning workspace', newDescription: 'ตั้งชื่อก่อน แล้วเราจะช่วยคุณจัดการส่วนที่เหลือ', namePlaceholder: 'เช่น งานแต่งฤดูใบไม้ผลิ, เปิดตัวสินค้า Q2, SaaS MVP 6 เดือน…', creating: 'กำลังสร้าง…', uploadAndStart: 'อัปโหลดและเริ่ม', startPlanning: 'เริ่มวางแผน', aiPlanning: 'การวางแผนด้วย AI' },
    importFlow: { title: 'นำเข้าโปรเจกต์บรีฟ', pickSource: 'เลือกแหล่งข้อมูล', reviewExtraction: 'ตรวจการดึงข้อมูล', nameAndStart: 'ตั้งชื่อและเริ่ม', readingFiles: 'กำลังอ่านไฟล์ของคุณ…', dropFiles: 'ลากไฟล์มาที่นี่หรือคลิกเพื่อเลือก', supportedFiles: 'PDF, Word, Excel, CSV, ข้อความ, รูปภาพ · สูงสุด 5 ไฟล์', orPaste: 'หรือวางข้อความ', pastePlaceholder: 'วางบรีฟโปรเจกต์ อีเมล บันทึกการประชุม หรือบริบทเริ่มต้นใดๆ…', usePastedText: 'ใช้ข้อความที่วาง', reviewIntro: 'เราได้ดึงข้อมูลต่อไปนี้จากการนำเข้า กรุณาตรวจสอบก่อนดำเนินการต่อ', previewExtractedText: 'ดูตัวอย่างข้อความที่ดึงได้', removeFile: 'ลบไฟล์', importWarning: 'ไฟล์นี้ต้องใช้โมเดล AI ที่รองรับ vision เพื่อทำความเข้าใจ แต่จะยังถูกแนบเป็นข้อมูลอ้างอิง' },
    planning: { status: 'สถานะ', sources: 'แหล่งข้อมูล', workflowNotes: 'บันทึก workflow', timeline: 'ไทม์ไลน์', history: 'ประวัติ', currentPhase: 'เฟสปัจจุบัน', pendingApprovals: 'การอนุมัติที่รออยู่', latestEvent: 'เหตุการณ์ล่าสุด', attentionItems: 'รายการที่ต้องสนใจ', aiRuntime: 'AI runtime', noPlanningMilestones: 'ยังไม่มีหลักไมล์การวางแผน', noActionRecorded: 'ยังไม่มีการบันทึกการกระทำ', currentPlanningAndRuntime: 'สถานะการวางแผนและ runtime ปัจจุบัน', importedSources: 'แหล่งข้อมูลที่นำเข้า', workflowNotesDescription: 'กติกา การตรวจสอบ และบันทึกการทำงาน', planningTimeline: 'ไทม์ไลน์การวางแผน', recentPlanningEvents: 'เหตุการณ์การวางแผนล่าสุด', all: 'ทั้งหมด', sourcesFilter: 'แหล่งข้อมูล', revisions: 'การแก้ไข', tasks: 'งาน', planningMilestonesEvolve: 'หลักไมล์การวางแผนจะปรากฏที่นี่เมื่อโปรเจกต์พัฒนาไป', savedUserContext: 'บริบทผู้ใช้ที่บันทึกไว้', needsAttention: 'ต้องใส่ใจ' },
    personalAI: { title: 'บริบท AI ส่วนตัว', subtitle: 'การตั้งค่าเหล่านี้จะถูกใช้ซ้ำในหลายโปรเจกต์เพื่อให้การวางแผนสม่ำเสมอขึ้น', preferredLanguage: 'ภาษาที่ต้องการ', responseStyle: 'รูปแบบการตอบ', planningFormat: 'รูปแบบการวางแผน', workingNotes: 'บันทึกการทำงานสำหรับ AI', notePlaceholder: 'ตัวอย่าง: ใช้ภาษาไทยเป็นค่าเริ่มต้น จัดโครงสร้างให้อ่านง่าย และเน้น action items ที่มี owner และ deadline ชัดเจน', english: 'อังกฤษ', vietnamese: 'เวียดนาม', bilingual: 'สองภาษา', concise: 'กระชับ', balanced: 'สมดุล', detailed: 'ละเอียด', bulletsFirst: 'ใช้ bullet ก่อน', structuredDoc: 'เอกสารมีโครงสร้าง', actionFirst: 'เน้นการลงมือทำ', savePreferences: 'บันทึกการตั้งค่า' },
    mission: { runtime: 'Runtime', totalTasks: 'งานทั้งหมด', inExecution: 'กำลังดำเนินการ', completed: 'เสร็จแล้ว', archived: 'เก็บถาวร', agents: 'Agents', closeMission: 'ปิด mission', aiProcessing: 'AI กำลังประมวลผล', newTask: 'งานใหม่' },
    locale: { en: 'English', vi: 'Tiếng Việt', th: 'ไทย', ko: '한국어', ja: '日本語' },
  },
  ko: {
    nav: { projects: '프로젝트', directory: '디렉터리', timeline: '타임라인', insights: '인사이트', notifications: '알림', language: '언어', aiContext: '개인 AI 컨텍스트' },
    common: { cancel: '취소', save: '저장', close: '닫기', search: '검색...', markDone: '완료로 표시', nothingPending: '대기 중인 항목 없음', everythingClear: '모든 것이 정상' },
    dashboard: { heroBadge: 'AI 에이전트 기반', titlePrefix: '오늘 무엇을', titleAccent: '만들', titleSuffix: '까요?', subtitle: '전문 AI 에이전트 팀과 함께 프로젝트를 정리하고 계획하고 실행하세요.', method1: '방법 01', method2: '방법 02', newProject: '새 프로젝트', startFromDocuments: '문서에서 시작', createJourney: '새 프로젝트 여정 시작', createJourneyDescription: '간단한 아이디어에서 시작하거나 문서를 가져와 AI가 실행 청사진을 만들게 하세요.', aiAgentsReady: 'AI 에이전트 준비 완료', aiAgentsReadyDescription: '전문 AI 에이전트 집합이 전략 수립과 워크플로 자동화를 도와줄 준비가 되어 있습니다.', systemsOnline: '시스템 온라인', projectHistory: '프로젝트 히스토리', recentJourneys: '최근 여정', ready: '준비됨', journeysEmptyTitle: '여기에 프로젝트 여정이 표시됩니다', journeysEmptyDescription: '새 프로젝트를 시작하고 AI가 계획과 실행을 도와주게 하세요.', projectsCount: (count: number) => `${count}개 프로젝트` },
    playbook: { label: '플레이북' },
    createProject: { importTitle: '프로젝트 브리프 가져오기', newTitle: '무엇을 계획하고 있나요?', importDescription: '파일을 선택하면 planning workspace로 전환합니다.', newDescription: '이름만 정하세요. 나머지는 함께 정리해 나갑니다.', namePlaceholder: '예: 봄 웨딩, Q2 제품 출시, 6개월 SaaS MVP…', creating: '생성 중…', uploadAndStart: '업로드하고 시작', startPlanning: '계획 시작', aiPlanning: 'AI 기반 계획' },
    importFlow: { title: '프로젝트 브리프 가져오기', pickSource: '소스 선택', reviewExtraction: '추출 검토', nameAndStart: '이름 지정 및 시작', readingFiles: '파일을 읽는 중…', dropFiles: '파일을 여기로 드래그하거나 클릭해 선택하세요', supportedFiles: 'PDF, Word, Excel, CSV, 텍스트, 이미지 · 최대 5개 파일', orPaste: '또는 텍스트 붙여넣기', pastePlaceholder: '프로젝트 브리프, 이메일, 회의 메모 또는 시작 컨텍스트를 붙여넣으세요…', usePastedText: '붙여넣은 텍스트 사용', reviewIntro: '가져온 자료에서 다음 내용을 추출했습니다. 계속하기 전에 확인하세요.', previewExtractedText: '추출된 텍스트 미리보기', removeFile: '파일 제거', importWarning: '이 파일은 해석을 위해 vision 지원 AI 모델이 필요하지만 참조 자료로는 계속 첨부됩니다.' },
    planning: { status: '상태', sources: '소스', workflowNotes: '워크플로 노트', timeline: '타임라인', history: '히스토리', currentPhase: '현재 단계', pendingApprovals: '대기 중인 승인', latestEvent: '최근 이벤트', attentionItems: '주의 항목', aiRuntime: 'AI 런타임', noPlanningMilestones: '아직 계획 마일스톤이 없습니다', noActionRecorded: '기록된 작업이 없습니다', currentPlanningAndRuntime: '현재 계획 및 런타임 상태', importedSources: '가져온 소스', workflowNotesDescription: '규칙, 검증, 실시간 프로젝트 노트', planningTimeline: '계획 타임라인', recentPlanningEvents: '최근 계획 이벤트', all: '전체', sourcesFilter: '소스', revisions: '수정', tasks: '작업', planningMilestonesEvolve: '프로젝트가 진행되면 계획 마일스톤이 여기에 표시됩니다.', savedUserContext: '저장된 사용자 컨텍스트', needsAttention: '주의 필요' },
    personalAI: { title: '개인 AI 컨텍스트', subtitle: '이 설정은 여러 프로젝트에서 재사용되어 계획 경험을 더 일관되게 만듭니다.', preferredLanguage: '선호 언어', responseStyle: '응답 스타일', planningFormat: '계획 형식', workingNotes: 'AI를 위한 작업 메모', notePlaceholder: '예: 가능하면 한국어 사용. 읽기 쉬운 구조로 정리. 담당자와 마감일이 있는 action item 선호.', english: '영어', vietnamese: '베트남어', bilingual: '이중 언어', concise: '간결하게', balanced: '균형 있게', detailed: '상세하게', bulletsFirst: '불릿 우선', structuredDoc: '구조화된 문서', actionFirst: '행동 우선', savePreferences: '설정 저장' },
    mission: { runtime: '런타임', totalTasks: '전체 작업', inExecution: '실행 중', completed: '완료', archived: '보관됨', agents: '에이전트', closeMission: '미션 닫기', aiProcessing: 'AI 처리 중', newTask: '새 작업' },
    locale: { en: 'English', vi: 'Tiếng Việt', th: 'ไทย', ko: '한국어', ja: '日本語' },
  },
  ja: {
    nav: { projects: 'プロジェクト', directory: 'ディレクトリ', timeline: 'タイムライン', insights: 'インサイト', notifications: '通知', language: '言語', aiContext: '個人AIコンテキスト' },
    common: { cancel: 'キャンセル', save: '保存', close: '閉じる', search: '検索...', markDone: '完了にする', nothingPending: '保留中の項目はありません', everythingClear: '問題ありません' },
    dashboard: { heroBadge: 'AIエージェント搭載', titlePrefix: '今日は何を', titleAccent: '作り', titleSuffix: 'ますか？', subtitle: '専門AIエージェントのチームと一緒に、プロジェクトを整理し、計画し、実行しましょう。', method1: '方法 01', method2: '方法 02', newProject: '新しいプロジェクト', startFromDocuments: 'ドキュメントから開始', createJourney: '新しいプロジェクトの旅を始める', createJourneyDescription: 'シンプルなアイデアから始めるか、ドキュメントを取り込んでAIに実行計画を作らせましょう。', aiAgentsReady: 'AIエージェント準備完了', aiAgentsReadyDescription: '専門AIエージェントの集団が、あなたの戦略立案とワークフロー自動化を即座に支援します。', systemsOnline: 'システム稼働中', projectHistory: 'プロジェクト履歴', recentJourneys: '最近のプロジェクト', ready: '準備完了', journeysEmptyTitle: 'あなたのプロジェクトはここに表示されます', journeysEmptyDescription: '新しいプロジェクトを開始し、AIに計画と実行を手伝ってもらいましょう。', projectsCount: (count: number) => `${count}件のプロジェクト` },
    playbook: { label: 'プレイブック' },
    createProject: { importTitle: 'プロジェクトブリーフを取り込む', newTitle: '何を計画していますか？', importDescription: 'ファイルを選ぶと planning workspace に変換します。', newDescription: 'まず名前を付けてください。残りは一緒に整理します。', namePlaceholder: '例: 春の結婚式、Q2製品ローンチ、6か月のSaaS MVP…', creating: '作成中…', uploadAndStart: 'アップロードして開始', startPlanning: '計画を開始', aiPlanning: 'AIによる計画' },
    importFlow: { title: 'プロジェクトブリーフを取り込む', pickSource: 'ソースを選択', reviewExtraction: '抽出内容を確認', nameAndStart: '名前を付けて開始', readingFiles: 'ファイルを読み込み中…', dropFiles: 'ここにファイルをドロップするかクリックして選択', supportedFiles: 'PDF、Word、Excel、CSV、テキスト、画像 · 最大5ファイル', orPaste: 'またはテキストを貼り付け', pastePlaceholder: 'プロジェクトブリーフ、メール、会議メモ、または開始コンテキストを貼り付けてください…', usePastedText: '貼り付けたテキストを使う', reviewIntro: '取り込み内容から以下を抽出しました。続行前に確認してください。', previewExtractedText: '抽出テキストをプレビュー', removeFile: 'ファイルを削除', importWarning: 'このファイルを理解するには vision 対応AIモデルが必要ですが、参照資料としては引き続き添付されます。' },
    planning: { status: 'ステータス', sources: 'ソース', workflowNotes: 'ワークフローノート', timeline: 'タイムライン', history: '履歴', currentPhase: '現在のフェーズ', pendingApprovals: '保留中の承認', latestEvent: '最新イベント', attentionItems: '注意項目', aiRuntime: 'AIランタイム', noPlanningMilestones: 'まだ計画マイルストーンはありません', noActionRecorded: 'まだ記録されたアクションはありません', currentPlanningAndRuntime: '現在の計画とランタイムの状態', importedSources: '取り込んだソース', workflowNotesDescription: 'ルール、検証、ライブノート', planningTimeline: '計画タイムライン', recentPlanningEvents: '最近の計画イベント', all: 'すべて', sourcesFilter: 'ソース', revisions: '改訂', tasks: 'タスク', planningMilestonesEvolve: 'プロジェクトが進むと計画マイルストーンがここに表示されます。', savedUserContext: '保存されたユーザーコンテキスト', needsAttention: '対応が必要' },
    personalAI: { title: '個人AIコンテキスト', subtitle: 'これらの設定は複数のプロジェクトで再利用され、より一貫した計画体験になります。', preferredLanguage: '希望言語', responseStyle: '応答スタイル', planningFormat: '計画フォーマット', workingNotes: 'AIへの作業メモ', notePlaceholder: '例: 可能なら日本語を使う。読みやすい構造を保つ。担当者と期限が明確なアクションアイテムを優先する。', english: '英語', vietnamese: 'ベトナム語', bilingual: 'バイリンガル', concise: '簡潔', balanced: 'バランス', detailed: '詳細', bulletsFirst: '箇条書き優先', structuredDoc: '構造化ドキュメント', actionFirst: '行動優先', savePreferences: '設定を保存' },
    mission: { runtime: 'ランタイム', totalTasks: '総タスク数', inExecution: '実行中', completed: '完了', archived: 'アーカイブ済み', agents: 'エージェント', closeMission: 'ミッションを閉じる', aiProcessing: 'AI処理中', newTask: '新しいタスク' },
    locale: { en: 'English', vi: 'Tiếng Việt', th: 'ไทย', ko: '한국어', ja: '日本語' },
  },
} satisfies Record<UiLocale, Record<string, any>>

export function getMessages(locale: UiLocale): MessageDictionary {
  return messages[locale] ?? messages.en
}
