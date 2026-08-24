import React from 'react';

const EditableText = ({ value, path, onChange, className, style, placeholder = "[Click to edit]" }) => {
  const handleBlur = (e) => {
    const text = e.currentTarget.innerText.trim();
    if (onChange) {
      onChange(path, text);
    }
  };

  if (!onChange) {
    return <span className={className} style={style}>{value || ''}</span>;
  }

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`${className} outline-none focus:bg-slate-100 hover:bg-slate-50/50 p-0.5 rounded transition-colors cursor-text min-w-[20px] inline-block`}
      style={style}
    >
      {value || placeholder}
    </span>
  );
};

const CustomFieldsView = ({ fields, pathPrefix, onChange }) => {
  if (!fields || fields.length === 0) return null;
  return (
    <div className="mt-2 space-y-1 border-t border-gray-100 pt-1">
      {fields.map((cf, idx) => (
        <div key={idx} className="text-xs text-slate-600">
          <strong className="font-semibold text-slate-800">{cf.label}:</strong>{' '}
          <EditableText value={cf.value} path={[...pathPrefix, idx, 'value']} onChange={onChange} />
        </div>
      ))}
    </div>
  );
};

const ClassicTemplate = ({ data, accentColor, onChange }) => {
  const { personalInfo, education = [], experience = [], skills = [], projects = [], languages = [], customSections = [] } = data || {};

  return (
    <div className="bg-white text-[#1e293b] p-8 h-[297mm] min-h-[297mm] font-sans shadow-xl text-left text-xs leading-relaxed max-w-[800px] mx-auto border border-gray-200 overflow-hidden">
      <div className="pb-4 mb-6 border-b-2" style={{ borderColor: accentColor }}>
        <h1 className="text-2xl font-bold tracking-tight text-[#041329] uppercase mb-1">
          <EditableText value={personalInfo?.fullName} path={['personalInfo', 'fullName']} onChange={onChange} placeholder="Full Name" />
        </h1>
        <p className="text-sm font-semibold mb-3" style={{ color: accentColor }}>
          <EditableText value={personalInfo?.summary ? personalInfo.summary.split('.')[0] : ''} path={['personalInfo', 'summary']} onChange={onChange} placeholder="Professional Profile Title" />
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500 font-mono">
          {personalInfo?.email && (
            <span className="flex items-center gap-1">
              Email: <span className="text-[#1e293b]"><EditableText value={personalInfo.email} path={['personalInfo', 'email']} onChange={onChange} /></span>
            </span>
          )}
          {personalInfo?.phone && (
            <span className="flex items-center gap-1">
              Phone: <span className="text-[#1e293b]"><EditableText value={personalInfo.phone} path={['personalInfo', 'phone']} onChange={onChange} /></span>
            </span>
          )}
          {personalInfo?.linkedin && (
            <span className="flex items-center gap-1">
              LinkedIn: <span className="text-[#1e293b]"><EditableText value={personalInfo.linkedin} path={['personalInfo', 'linkedin']} onChange={onChange} /></span>
            </span>
          )}
          {personalInfo?.github && (
            <span className="flex items-center gap-1">
              GitHub: <span className="text-[#1e293b]"><EditableText value={personalInfo.github} path={['personalInfo', 'github']} onChange={onChange} /></span>
            </span>
          )}
        </div>
        <CustomFieldsView fields={personalInfo?.customFields} pathPrefix={['personalInfo', 'customFields']} onChange={onChange} />
      </div>

      {personalInfo?.summary && (
        <div className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-[#041329] border-b border-gray-200 pb-1 mb-2">
            Professional Summary
          </h2>
          <p className="text-gray-600 text-justify">
            <EditableText value={personalInfo.summary} path={['personalInfo', 'summary']} onChange={onChange} />
          </p>
        </div>
      )}

      {experience && experience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-[#041329] border-b border-gray-200 pb-1 mb-2">
            Work Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>
                    <EditableText value={exp.role} path={['experience', idx, 'role']} onChange={onChange} placeholder="Role" />{' '}
                    <span className="text-gray-400 font-normal">at</span>{' '}
                    <EditableText value={exp.company} path={['experience', idx, 'company']} onChange={onChange} placeholder="Company" />
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    <EditableText value={exp.startDate} path={['experience', idx, 'startDate']} onChange={onChange} /> –{' '}
                    <EditableText value={exp.endDate} path={['experience', idx, 'endDate']} onChange={onChange} />
                  </span>
                </div>
                {exp.description && (
                  <p className="text-gray-600 mt-1 whitespace-pre-line">
                    <EditableText value={exp.description} path={['experience', idx, 'description']} onChange={onChange} />
                  </p>
                )}
                <CustomFieldsView fields={exp.customFields} pathPrefix={['experience', idx, 'customFields']} onChange={onChange} />
              </div>
            ))}
          </div>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-[#041329] border-b border-gray-200 pb-1 mb-2">
            Key Projects
          </h2>
          <div className="space-y-4">
            {projects.map((proj, idx) => (
              <div key={idx}>
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>
                    <EditableText value={proj.title} path={['projects', idx, 'title']} onChange={onChange} placeholder="Project Title" />
                  </span>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <span className="text-[9px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {proj.technologies.join(', ')}
                    </span>
                  )}
                </div>
                {proj.description && (
                  <p className="text-gray-600 mt-1 whitespace-pre-line">
                    <EditableText value={proj.description} path={['projects', idx, 'description']} onChange={onChange} />
                  </p>
                )}
                <CustomFieldsView fields={proj.customFields} pathPrefix={['projects', idx, 'customFields']} onChange={onChange} />
              </div>
            ))}
          </div>
        </div>
      )}

      {education && education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-[#041329] border-b border-gray-200 pb-1 mb-2">
            Education
          </h2>
          <div className="space-y-3">
            {education.map((edu, idx) => (
              <div key={idx}>
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>
                    <EditableText value={edu.degree} path={['education', idx, 'degree']} onChange={onChange} placeholder="Degree" />
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    <EditableText value={edu.startYear} path={['education', idx, 'startYear']} onChange={onChange} /> –{' '}
                    <EditableText value={edu.endYear} path={['education', idx, 'endYear']} onChange={onChange} />
                  </span>
                </div>
                <div className="text-gray-500 text-[10px]">
                  <EditableText value={edu.institution} path={['education', idx, 'institution']} onChange={onChange} placeholder="School" />
                </div>
                {edu.description && (
                  <p className="text-gray-600 mt-1">
                    <EditableText value={edu.description} path={['education', idx, 'description']} onChange={onChange} />
                  </p>
                )}
                <CustomFieldsView fields={edu.customFields} pathPrefix={['education', idx, 'customFields']} onChange={onChange} />
              </div>
            ))}
          </div>
        </div>
      )}

      {skills && skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-[#041329] border-b border-gray-200 pb-1 mb-1">
            Skills & Competencies
          </h2>
          <div className="flex flex-wrap gap-2 pt-2">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="bg-gray-100 text-[#041329] px-2.5 py-1 rounded text-[10px] font-medium border border-gray-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {languages && languages.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-[#041329] border-b border-gray-200 pb-1 mb-2">
            Languages
          </h2>
          <div className="flex flex-wrap gap-2 pt-1">
            {languages.map((lang, idx) => (
              <span key={idx} className="bg-gray-55 text-[#041329] px-2.5 py-1 rounded text-[10px] font-medium border border-gray-200">
                <EditableText value={lang.language} path={['languages', idx, 'language']} onChange={onChange} />{' '}
                <span className="text-gray-400 ml-1">
                  (<EditableText value={lang.level} path={['languages', idx, 'level']} onChange={onChange} />)
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {customSections && customSections.map((sec, secIdx) => (
        <div key={sec.id || secIdx} className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-[#041329] border-b border-gray-200 pb-1 mb-2">
            <EditableText value={sec.title} path={['customSections', secIdx, 'title']} onChange={onChange} placeholder="New Section" />
          </h2>
          <p className="text-gray-600 text-justify whitespace-pre-line">
            <EditableText value={sec.content} path={['customSections', secIdx, 'content']} onChange={onChange} />
          </p>
        </div>
      ))}
    </div>
  );
};

const ModernTemplate = ({ data, accentColor, onChange }) => {
  const { personalInfo, education = [], experience = [], skills = [], projects = [], languages = [], customSections = [] } = data || {};

  return (
    <div className="bg-white text-[#334155] h-[297mm] min-h-[297mm] font-sans shadow-xl text-left text-xs leading-relaxed max-w-[800px] mx-auto border border-gray-200 grid grid-cols-12 overflow-hidden">
      <div className="col-span-4 bg-[#0f172a] text-[#f1f5f9] p-6 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mb-3 text-white" style={{ backgroundColor: accentColor }}>
            {personalInfo?.fullName ? (personalInfo.fullName.split(' ').map(n => n[0]).join('').toUpperCase()) : 'CV'}
          </div>
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            <EditableText value={personalInfo?.fullName} path={['personalInfo', 'fullName']} onChange={onChange} placeholder="Name" />
          </h2>
          <span className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: accentColor }}>Candidate</span>
        </div>

        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest border-b pb-1.5 mb-2.5" style={{ color: accentColor, borderColor: `${accentColor}33` }}>Contact</h3>
          <ul className="space-y-2 text-[9px] font-mono text-slate-300">
            {personalInfo?.email && <li>✉ <EditableText value={personalInfo.email} path={['personalInfo', 'email']} onChange={onChange} /></li>}
            {personalInfo?.phone && <li>☎ <EditableText value={personalInfo.phone} path={['personalInfo', 'phone']} onChange={onChange} /></li>}
            {personalInfo?.linkedin && <li>🔗 <EditableText value={personalInfo.linkedin} path={['personalInfo', 'linkedin']} onChange={onChange} /></li>}
            {personalInfo?.github && <li>💻 <EditableText value={personalInfo.github} path={['personalInfo', 'github']} onChange={onChange} /></li>}
          </ul>
          <CustomFieldsView fields={personalInfo?.customFields} pathPrefix={['personalInfo', 'customFields']} onChange={onChange} />
        </div>

        {skills && skills.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest border-b pb-1.5 mb-2.5" style={{ color: accentColor, borderColor: `${accentColor}33` }}>Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, idx) => (
                <span key={idx} className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded text-[9px] font-medium border border-slate-700">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {languages && languages.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest border-b pb-1.5 mb-2.5" style={{ color: accentColor, borderColor: `${accentColor}33` }}>Languages</h3>
            <div className="flex flex-wrap gap-1.5">
              {languages.map((lang, idx) => (
                <span key={idx} className="bg-slate-800 text-slate-205 px-2 py-0.5 rounded text-[9px] font-medium border border-slate-700">
                  <EditableText value={lang.language} path={['languages', idx, 'language']} onChange={onChange} />{' '}
                  <span className="text-slate-400 text-[8px]">
                    (<EditableText value={lang.level} path={['languages', idx, 'level']} onChange={onChange} />)
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="col-span-8 p-8 bg-slate-50 flex flex-col gap-6">
        {personalInfo?.summary && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-[#0f172a] border-b-2 border-slate-200 pb-1 mb-2">Profile Summary</h3>
            <p className="text-slate-600 text-justify leading-relaxed">
              <EditableText value={personalInfo.summary} path={['personalInfo', 'summary']} onChange={onChange} />
            </p>
          </div>
        )}

        {experience && experience.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-[#0f172a] border-b-2 border-slate-200 pb-1 mb-3">Experience</h3>
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx} className="border-l-2 pl-3 py-0.5" style={{ borderColor: accentColor }}>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>
                      <EditableText value={exp.role} path={['experience', idx, 'role']} onChange={onChange} placeholder="Role" />{' '}
                      <span className="text-slate-400 font-normal">at</span>{' '}
                      <EditableText value={exp.company} path={['experience', idx, 'company']} onChange={onChange} placeholder="Company" />
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      <EditableText value={exp.startDate} path={['experience', idx, 'startDate']} onChange={onChange} /> –{' '}
                      <EditableText value={exp.endDate} path={['experience', idx, 'endDate']} onChange={onChange} />
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-slate-600 mt-1 whitespace-pre-line">
                      <EditableText value={exp.description} path={['experience', idx, 'description']} onChange={onChange} />
                    </p>
                  )}
                  <CustomFieldsView fields={exp.customFields} pathPrefix={['experience', idx, 'customFields']} onChange={onChange} />
                </div>
              ))}
            </div>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-[#0f172a] border-b-2 border-slate-200 pb-1 mb-3">Key Projects</h3>
            <div className="space-y-4">
              {projects.map((proj, idx) => (
                <div key={idx}>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>
                      <EditableText value={proj.title} path={['projects', idx, 'title']} onChange={onChange} placeholder="Project" />
                    </span>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <span className="text-[9px] font-mono font-bold" style={{ color: accentColor }}>
                        [{proj.technologies.join(', ')}]
                      </span>
                    )}
                  </div>
                  {proj.description && (
                    <p className="text-slate-600 mt-1 whitespace-pre-line">
                      <EditableText value={proj.description} path={['projects', idx, 'description']} onChange={onChange} />
                    </p>
                  )}
                  <CustomFieldsView fields={proj.customFields} pathPrefix={['projects', idx, 'customFields']} onChange={onChange} />
                </div>
              ))}
            </div>
          </div>
        )}

        {education && education.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-[#0f172a] border-b-2 border-slate-200 pb-1 mb-2">Education</h3>
            <div className="space-y-3">
              {education.map((edu, idx) => (
                <div key={idx}>
                  <div className="flex justify-between font-bold text-slate-805">
                    <span>
                      <EditableText value={edu.degree} path={['education', idx, 'degree']} onChange={onChange} placeholder="Degree" />
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      <EditableText value={edu.endYear} path={['education', idx, 'endYear']} onChange={onChange} />
                    </span>
                  </div>
                  <div className="text-slate-500 text-[10px] font-medium">
                    <EditableText value={edu.institution} path={['education', idx, 'institution']} onChange={onChange} placeholder="School" />
                  </div>
                  {edu.description && (
                    <p className="text-slate-550 mt-1 text-[10px]">
                      <EditableText value={edu.description} path={['education', idx, 'description']} onChange={onChange} />
                    </p>
                  )}
                  <CustomFieldsView fields={edu.customFields} pathPrefix={['education', idx, 'customFields']} onChange={onChange} />
                </div>
              ))}
            </div>
          </div>
        )}

        {customSections && customSections.map((sec, secIdx) => (
          <div key={sec.id || secIdx}>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-[#0f172a] border-b-2 border-slate-200 pb-1 mb-2">
              <EditableText value={sec.title} path={['customSections', secIdx, 'title']} onChange={onChange} placeholder="New Section" />
            </h3>
            <p className="text-slate-600 text-justify leading-relaxed whitespace-pre-line">
              <EditableText value={sec.content} path={['customSections', secIdx, 'content']} onChange={onChange} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const CreativeTemplate = ({ data, accentColor, onChange }) => {
  const { personalInfo, education = [], experience = [], skills = [], projects = [], languages = [], customSections = [] } = data || {};

  return (
    <div className="bg-white text-[#475569] p-8 h-[297mm] min-h-[297mm] font-sans shadow-xl text-left text-xs leading-relaxed max-w-[800px] mx-auto relative border-t-8 border-gray-200 overflow-hidden" style={{ borderTopColor: accentColor }}>
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
            <EditableText value={personalInfo?.fullName} path={['personalInfo', 'fullName']} onChange={onChange} placeholder="Full Name" />
          </h1>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: accentColor }}>
            <EditableText value={personalInfo?.summary ? personalInfo.summary.split('.')[0] : ''} path={['personalInfo', 'summary']} onChange={onChange} placeholder="Creative Field" />
          </p>
        </div>
        <div className="flex flex-col gap-1 text-[9px] font-semibold text-slate-500">
          {personalInfo?.email && <span>✉ <EditableText value={personalInfo.email} path={['personalInfo', 'email']} onChange={onChange} /></span>}
          {personalInfo?.phone && <span>☎ <EditableText value={personalInfo.phone} path={['personalInfo', 'phone']} onChange={onChange} /></span>}
          {personalInfo?.linkedin && <span>🔗 <EditableText value={personalInfo.linkedin} path={['personalInfo', 'linkedin']} onChange={onChange} /></span>}
          {personalInfo?.github && <span>💻 <EditableText value={personalInfo.github} path={['personalInfo', 'github']} onChange={onChange} /></span>}
        </div>
        <CustomFieldsView fields={personalInfo?.customFields} pathPrefix={['personalInfo', 'customFields']} onChange={onChange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {personalInfo?.summary && (
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-l-4 pl-2 mb-2" style={{ borderColor: accentColor }}>About Me</h2>
              <p className="text-slate-600 text-justify">
                <EditableText value={personalInfo.summary} path={['personalInfo', 'summary']} onChange={onChange} />
              </p>
            </div>
          )}

          {experience && experience.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-l-4 pl-2 mb-3" style={{ borderColor: accentColor }}>Work History</h2>
              <div className="space-y-4">
                {experience.map((exp, idx) => (
                  <div key={idx} className="relative pl-1">
                    <div className="flex justify-between font-bold text-slate-805">
                      <span>
                        <EditableText value={exp.role} path={['experience', idx, 'role']} onChange={onChange} placeholder="Role" />{' '}
                        <span className="text-[#3b82f6]">@</span>{' '}
                        <EditableText value={exp.company} path={['experience', idx, 'company']} onChange={onChange} placeholder="Company" />
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        <EditableText value={exp.startDate} path={['experience', idx, 'startDate']} onChange={onChange} /> –{' '}
                        <EditableText value={exp.endDate} path={['experience', idx, 'endDate']} onChange={onChange} />
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-slate-600 mt-1 whitespace-pre-line">
                        <EditableText value={exp.description} path={['experience', idx, 'description']} onChange={onChange} />
                      </p>
                    )}
                    <CustomFieldsView fields={exp.customFields} pathPrefix={['experience', idx, 'customFields']} onChange={onChange} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects && projects.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-l-4 pl-2 mb-3" style={{ borderColor: accentColor }}>Key Projects</h2>
              <div className="space-y-4">
                {projects.map((proj, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between font-bold text-slate-805">
                      <span>
                        <EditableText value={proj.title} path={['projects', idx, 'title']} onChange={onChange} placeholder="Project" />
                      </span>
                      <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border" style={{ backgroundColor: `${accentColor}10`, color: accentColor, borderColor: `${accentColor}30` }}>
                        Project
                      </span>
                    </div>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {proj.technologies.map((tech, tIdx) => (
                          <span key={tIdx} className="text-[8px] font-mono bg-slate-100 text-slate-500 px-1 py-0.2 rounded">{tech}</span>
                        ))}
                      </div>
                    )}
                    {proj.description && (
                      <p className="text-slate-600 mt-1.5 whitespace-pre-line">
                        <EditableText value={proj.description} path={['projects', idx, 'description']} onChange={onChange} />
                      </p>
                    )}
                    <CustomFieldsView fields={proj.customFields} pathPrefix={['projects', idx, 'customFields']} onChange={onChange} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {customSections && customSections.map((sec, secIdx) => (
            <div key={sec.id || secIdx}>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-l-4 pl-2 mb-2" style={{ borderColor: accentColor }}>
                <EditableText value={sec.title} path={['customSections', secIdx, 'title']} onChange={onChange} placeholder="New Section" />
              </h2>
              <p className="text-slate-605 text-justify whitespace-pre-line">
                <EditableText value={sec.content} path={['customSections', secIdx, 'content']} onChange={onChange} />
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {skills && skills.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-l-4 pl-2 mb-3" style={{ borderColor: accentColor }}>Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, idx) => (
                  <span key={idx} className="bg-white text-slate-800 shadow-sm border border-slate-200/60 px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-all border-transparent hover:border-blue-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {education && education.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-l-4 pl-2 mb-3" style={{ borderColor: accentColor }}>Education</h2>
              <div className="space-y-3">
                {education.map((edu, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="font-bold text-slate-800 text-[11px]">
                      <EditableText value={edu.degree} path={['education', idx, 'degree']} onChange={onChange} placeholder="Degree" />
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-wider mt-0.5" style={{ color: accentColor }}>
                      <EditableText value={edu.institution} path={['education', idx, 'institution']} onChange={onChange} placeholder="School" />
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-1">
                      <EditableText value={edu.endYear} path={['education', idx, 'endYear']} onChange={onChange} />
                    </div>
                    {edu.description && (
                      <p className="text-slate-500 mt-1 text-[10px]">
                        <EditableText value={edu.description} path={['education', idx, 'description']} onChange={onChange} />
                      </p>
                    )}
                    <CustomFieldsView fields={edu.customFields} pathPrefix={['education', idx, 'customFields']} onChange={onChange} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {languages && languages.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-l-4 pl-2 mb-3" style={{ borderColor: accentColor }}>Languages</h2>
              <div className="flex flex-wrap gap-1.5">
                {languages.map((lang, idx) => (
                  <span key={idx} className="bg-white text-slate-800 shadow-sm border border-slate-200/60 px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                    <EditableText value={lang.language} path={['languages', idx, 'language']} onChange={onChange} />{' '}
                    <span className="text-slate-400 text-[8px] ml-1">
                      (<EditableText value={lang.level} path={['languages', idx, 'level']} onChange={onChange} />)
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CVPreviewer = ({ theme = 'classic', accentColor = '#3b82f6', data, onChange }) => {
  const activeTheme = (theme || 'classic').toLowerCase().trim();
  return (
    <div id="cv-print-area">
      {activeTheme === 'modern' ? (
        <ModernTemplate data={data} accentColor={accentColor} onChange={onChange} />
      ) : activeTheme === 'creative' ? (
        <CreativeTemplate data={data} accentColor={accentColor} onChange={onChange} />
      ) : (
        <ClassicTemplate data={data} accentColor={accentColor} onChange={onChange} />
      )}
    </div>
  );
};

export default CVPreviewer;