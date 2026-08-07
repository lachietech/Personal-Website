(function () {
    const byId = (id) => document.getElementById(id);
    const els = {
        list: byId('projectList'), form: byId('projectForm'), importForm: byId('githubImportForm'),
        repository: byId('githubRepository'), id: byId('projectId'), title: byId('projectTitle'),
        slug: byId('projectSlug'), type: byId('projectType'), status: byId('projectStatus'),
        url: byId('projectUrl'), image: byId('projectImage'), summary: byId('projectSummary'),
        order: byId('projectSortOrder'), featured: byId('projectFeatured'), published: byId('projectPublished'),
        message: byId('projectMessage'), remove: byId('deleteProjectButton'), create: byId('newProjectButton')
    };
    if (!els.form) return;
    let projects = [];

    function payload() {
        return { title: els.title.value, slug: els.slug.value, type: els.type.value, status: els.status.value,
            url: els.url.value, image: els.image.value, summary: els.summary.value,
            sortOrder: Number(els.order.value), featured: els.featured.checked, published: els.published.checked };
    }
    function reset() {
        els.form.reset(); els.id.value = ''; els.order.value = 0; els.published.checked = true;
        els.remove.hidden = true; Portal.setMessage(els.message, '');
    }
    function select(project) {
        els.id.value = project.id; els.title.value = project.title; els.slug.value = project.slug;
        els.type.value = project.type; els.status.value = project.status; els.url.value = project.url;
        els.image.value = project.image; els.summary.value = project.summary; els.order.value = project.sortOrder;
        els.featured.checked = project.featured; els.published.checked = project.published; els.remove.hidden = false;
    }
    function render() {
        els.list.innerHTML = projects.length ? projects.map((project) => `<button class="client-list-item" type="button" data-project-id="${project.id}"><strong>${Portal.escapeHtml(project.title)}</strong><span>${Portal.escapeHtml(project.type)} · ${project.published ? 'Published' : 'Draft'}</span></button>`).join('') : '<div class="empty-state"><p>No projects yet.</p></div>';
    }
    async function load() {
        try { projects = (await Portal.request('/clientportal/api/projects/admin')).projects; render(); }
        catch (error) { Portal.setMessage(els.message, error.message, 'error'); }
    }
    els.list.addEventListener('click', (event) => { const button = event.target.closest('[data-project-id]'); if (button) select(projects.find((item) => item.id === button.dataset.projectId)); });
    els.create.addEventListener('click', reset);
    els.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            const path = els.id.value ? `/clientportal/api/projects/admin/${els.id.value}` : '/clientportal/api/projects/admin';
            await Portal.request(path, { method: els.id.value ? 'PUT' : 'POST', body: payload() });
            await load(); reset(); Portal.setMessage(els.message, 'Project saved.', 'success');
        } catch (error) { Portal.setMessage(els.message, error.message, 'error'); }
    });
    els.remove.addEventListener('click', async () => {
        if (!els.id.value || !window.confirm('Delete this project?')) return;
        try { await Portal.request(`/clientportal/api/projects/admin/${els.id.value}`, { method: 'DELETE', body: {} }); await load(); reset(); }
        catch (error) { Portal.setMessage(els.message, error.message, 'error'); }
    });
    els.importForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try { await Portal.request('/clientportal/api/projects/admin/import-github', { method: 'POST', body: { repository: els.repository.value } }); els.repository.value = ''; await load(); Portal.setMessage(els.message, 'GitHub project imported.', 'success'); }
        catch (error) { Portal.setMessage(els.message, error.message, 'error'); }
    });
    load();
}());
