// Cloudflare D1 Serverless Database Wrapper
window.db = {
    async select(table, options = {}) {
        const response = await fetch('/functions/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'select',
                table: table,
                columns: options.columns || ['*'],
                where: options.where || {},
                order: options.order || ''
            })
        });
        const res = await response.json();
        if (!res.success) throw new Error(res.error);
        return res.data;
    },
    async insert(table, data) {
        const response = await fetch('/functions/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'insert',
                table: table,
                data: data
            })
        });
        const res = await response.json();
        if (!res.success) throw new Error(res.error);
        return res.data;
    },
    async update(table, data, where) {
        const response = await fetch('/functions/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                table: table,
                data: data,
                where: where
            })
        });
        const res = await response.json();
        if (!res.success) throw new Error(res.error);
        return res;
    },
    async delete(table, where) {
        const response = await fetch('/functions/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                table: table,
                where: where
            })
        });
        const res = await response.json();
        if (!res.success) throw new Error(res.error);
        return res;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const entryForm = document.getElementById('entry-form');
    const studentListBody = document.getElementById('students-list');
    const totalStudentsDisplay = document.getElementById('total-students');
    const presentStudentsDisplay = document.getElementById('present-students');
    const lateStudentsDisplay = document.getElementById('late-students');
    const searchInput = document.getElementById('search-input');
    const displayedCountDisplay = document.getElementById('displayed-count');

    // --- State Management ---
    let students = [];

    // --- Helper Functions ---

    // Get current time in HH:MM AM/PM format
    function getCurrentTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutesStr} ${ampm}`;
    }

    // Update dashboard statistics
    function updateDashboard() {
        const total = students.length;
        const present = students.filter(s => s.status === 'A tiempo').length;
        const late = students.filter(s => s.status === 'Retardo').length;

        totalStudentsDisplay.textContent = total;
        presentStudentsDisplay.textContent = present;
        lateStudentsDisplay.textContent = late;
        displayedCountDisplay.textContent = studentListBody.querySelectorAll('tr:not(.no-results)').length;
    }

    // Create a table row for a student
    function createStudentRow(student) {
        const row = document.createElement('tr');
        row.dataset.id = student.id; // Assign a unique ID for deletion

        const statusClass = student.status === 'A tiempo' ? 'ontime' : 'late';
        const avatarText = student.name.split(' ').map(word => word[0]).join('').toUpperCase();

        row.innerHTML = `
            <td>
                <div class="student-profile">
                    <div class="avatar">${avatarText}</div>
                    <span class="name">${student.name}</span>
                </div>
            </td>
            <td><span class="badge-id">${student.id}</span></td>
            <td>${student.grade}</td>
            <td>${student.time}</td>
            <td><span class="status-badge ${statusClass}">${student.status}</span></td>
            <td>
                <buttonclass="btn-action delete" title="Eliminar Registro">
                                        <i class="fa-regular fa-trash-can"></i>
                                    </button>
                                </td>
        `;

        // Add event listener for the delete button
        row.querySelector('.btn-action.delete').addEventListener('click', handleDelete);
        return row;
    }

    // Render the student list to the table body
    function renderStudentList(studentsToRender) {
        studentListBody.innerHTML = ''; // Clear existing list
        if (studentsToRender.length === 0) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.classList.add('no-results');
            noResultsRow.innerHTML = '<td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No se encontraron alumnos.</td>';
            studentListBody.appendChild(noResultsRow);
        } else {
            studentsToRender.forEach(student => {
                const row = createStudentRow(student);
                studentListBody.appendChild(row);
            });
        }
        updateDashboard(); // Update counts after rendering
    }

    // Add a new student
    function addStudent(event) {
        event.preventDefault(); // Prevent default form submission

        const nameInput = document.getElementById('student-name');
        const idInput = document.getElementById('student-id');
        const gradeInput = document.getElementById('student-grade');
        const statusInput = document.querySelector('input[name="entry-status"]:checked');

        const newStudent = {
            id: Date.now().toString(), // Simple unique ID
            name: nameInput.value.trim(),
            studentId: idInput.value.trim(),
            grade: gradeInput.value,
            status: statusInput.value,
            time: getCurrentTime()
        };

        // Basic validation
        if (!newStudent.name || !newStudent.studentId || !newStudent.grade || !newStudent.status) {
            alert('Por favor, complete todos los campos obligatorios.');
            return;
        }

        students.push(newStudent);
        renderStudentList(students);

        // Clear the form
        entryForm.reset();
        // Ensure radio button is rechecked if needed (form.reset() handles it but good for clarity)
        document.querySelector('input[name="entry-status"][value="A tiempo"]').checked = true;
    }

    // Delete a student
    function handleDelete(event) {
        const button = event.target.closest('.btn-action.delete');
        const row = button.closest('tr');
        const studentId = row.dataset.id;

        if (confirm('¿Está seguro de que desea eliminar este registro de alumno?')) {
            students = students.filter(student => student.id !== studentId);
            renderStudentList(students);
        }
    }

    // Filter students based on search input
    function filterStudents() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredStudents = students.filter(student =>
            student.name.toLowerCase().includes(searchTerm) ||
            student.studentId.toLowerCase().includes(searchTerm) ||
            student.grade.toLowerCase().includes(searchTerm)
        );
        renderStudentList(filteredStudents);
    }

    // --- Event Listeners ---
    entryForm.addEventListener('submit', addStudent);
    searchInput.addEventListener('input', filterStudents);

    // --- Initial Load ---
    // Load initial example data if any
    const initialExampleRows = document.querySelectorAll('#students-list tr');
    initialExampleRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const student = {
            id: Date.now().toString() + Math.random(), // Assign a unique ID to examples too
            name: cells[0].querySelector('.name').textContent,
            studentId: cells[1].querySelector('.badge-id').textContent,
            grade: cells[2].textContent,
            status: cells[4].textContent.trim(),
            time: cells[3].textContent
        };
        students.push(student);
    });

    renderStudentList(students); // Render initial list and update stats
});
