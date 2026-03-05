export const normalizeMergeRequests = (rawMrs) => {

  return rawMrs
    .flat(2)
    .map(mr => ({
      id: mr.iid,
      projectId: mr.project_id,
      author: {
        id: mr.author.id,
        name: mr.author.name
      },
      title: mr.title,
      createdAt: mr.created_at,
      mergedAt: mr.merged_at,
      state: mr.state,
      isDraft:
        mr.draft ??
        mr.title?.toLowerCase().includes("draft"),
      changesCount: mr.changes_count,
      url: mr.web_url,
      notes: mr.notes || []
    }));
};