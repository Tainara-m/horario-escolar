import { useState, useEffect } from "react";
import { Plus, Trash2, Shuffle, AlertCircle, CheckCircle2, X, Download } from "lucide-react";

const DIAS_TODOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TURNOS_TODOS = ["Manhã", "Tarde", "Noite"];
const CORES = [
  "#2C5F7C", "#3F8361", "#B8860B", "#6B4C8C",
  "#C0392B", "#2F7A82", "#A0522D", "#5C6B8C",
];

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function corDisciplina(disciplinas, id) {
  const idx = disciplinas.findIndex((d) => d.id === id);
  return CORES[idx % CORES.length] || "#5C6B8C";
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gradeVazia(turmas, dias, turnos, periodosPorTurno) {
  const s = {};
  turmas.forEach((t) => {
    s[t.id] = {};
    dias.forEach((d) => {
      s[t.id][d] = {};
      turnos.forEach((tu) => {
        s[t.id][d][tu] = {};
        const n = periodosPorTurno[tu] || 0;
        for (let p = 1; p <= n; p++) s[t.id][d][tu][p] = null;
      });
    });
  });
  return s;
}

function professorDisponivel(prof, dia, turno) {
  if (!prof) return true;
  if (prof.diasIndisponiveis?.includes(dia)) return false;
  if (prof.turnos?.length && !prof.turnos.includes(turno)) return false;
  return true;
}

const CHAVE_STORAGE = "horarioEscolar";
const PERIODOS_PADRAO = { Manhã: 5, Tarde: 5, Noite: 5 };

function carregarInicial(chave, padrao) {
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE);
    if (!raw) return padrao;
    const dados = JSON.parse(raw);
    return dados[chave] !== undefined ? dados[chave] : padrao;
  } catch {
    return padrao;
  }
}

export default function HorarioEscolar() {
  const [aba, setAba] = useState("professores");
  const [professores, setProfessores] = useState(() => carregarInicial("professores", []));
  const [disciplinas, setDisciplinas] = useState(() => carregarInicial("disciplinas", []));
  const [turmas, setTurmas] = useState(() => carregarInicial("turmas", []));
  const [dias, setDias] = useState(() => carregarInicial("dias", ["Seg", "Ter", "Qua", "Qui", "Sex"]));
  const [turnos, setTurnos] = useState(() => carregarInicial("turnos", ["Manhã"]));
  const [periodosPorTurno, setPeriodosPorTurno] = useState(() => carregarInicial("periodosPorTurno", PERIODOS_PADRAO));
  const [schedule, setSchedule] = useState(() => carregarInicial("schedule", {}));
  const [turmaAtiva, setTurmaAtiva] = useState(() => {
    const t = carregarInicial("turmas", []);
    return t[0]?.id || null;
  });
  const [msg, setMsg] = useState(null);

  const [nomeProf, setNomeProf] = useState("");
  const [nomeDisc, setNomeDisc] = useState("");
  const [profDisc, setProfDisc] = useState("");
  const [nomeTurma, setNomeTurma] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_STORAGE,
        JSON.stringify({ professores, disciplinas, turmas, dias, turnos, periodosPorTurno, schedule })
      );
    } catch {
      // localStorage indisponível — os dados só ficam na tela nesta sessão
    }
  }, [professores, disciplinas, turmas, dias, turnos, periodosPorTurno, schedule]);

  function limparDadosSalvos() {
    if (!window.confirm("Isso vai apagar professores, disciplinas, turmas e horários salvos. Continuar?")) return;
    try {
      localStorage.removeItem(CHAVE_STORAGE);
    } catch {}
    setProfessores([]);
    setDisciplinas([]);
    setTurmas([]);
    setDias(["Seg", "Ter", "Qua", "Qui", "Sex"]);
    setTurnos(["Manhã"]);
    setPeriodosPorTurno(PERIODOS_PADRAO);
    setSchedule({});
    setTurmaAtiva(null);
    avisar("sucesso", "Todos os dados salvos foram apagados.");
  }

  function avisar(tipo, texto) {
    setMsg({ tipo, texto });
    window.clearTimeout(window.__horarioMsgTimeout);
    window.__horarioMsgTimeout = window.setTimeout(() => setMsg(null), 4500);
  }

  // ---------- Cadastros ----------
  function addProfessor() {
    if (!nomeProf.trim()) return;
    setProfessores((p) => [...p, { id: genId(), nome: nomeProf.trim(), turnos: [], diasIndisponiveis: [] }]);
    setNomeProf("");
  }
  function removeProfessor(id) {
    setProfessores((p) => p.filter((x) => x.id !== id));
    setDisciplinas((d) => d.map((x) => (x.professorId === id ? { ...x, professorId: "" } : x)));
  }
  function toggleProfessorTurno(id, turno) {
    setProfessores((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const atual = p.turnos || [];
        const novo = atual.includes(turno) ? atual.filter((t) => t !== turno) : [...atual, turno];
        return { ...p, turnos: novo };
      })
    );
  }
  function toggleProfessorDiaIndisponivel(id, dia) {
    setProfessores((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const atual = p.diasIndisponiveis || [];
        const novo = atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia];
        return { ...p, diasIndisponiveis: novo };
      })
    );
  }

  function addDisciplina() {
    if (!nomeDisc.trim()) return;
    setDisciplinas((d) => [...d, { id: genId(), nome: nomeDisc.trim(), professorId: profDisc || "" }]);
    setNomeDisc("");
    setProfDisc("");
  }
  function removeDisciplina(id) {
    setDisciplinas((d) => d.filter((x) => x.id !== id));
    setTurmas((ts) => ts.map((t) => ({ ...t, curriculo: t.curriculo.filter((c) => c.disciplinaId !== id) })));
  }

  function addTurma() {
    if (!nomeTurma.trim()) return;
    const nova = { id: genId(), nome: nomeTurma.trim(), curriculo: [] };
    setTurmas((t) => [...t, nova]);
    setNomeTurma("");
  }
  function removeTurma(id) {
    setTurmas((t) => t.filter((x) => x.id !== id));
    if (turmaAtiva === id) setTurmaAtiva(null);
  }

  function addCurriculoItem(turmaId, disciplinaId) {
    if (!disciplinaId) return;
    setTurmas((ts) =>
      ts.map((t) => {
        if (t.id !== turmaId) return t;
        if (t.curriculo.some((c) => c.disciplinaId === disciplinaId)) return t;
        return { ...t, curriculo: [...t.curriculo, { disciplinaId, aulas: 1 }] };
      })
    );
  }
  function setCurriculoAulas(turmaId, disciplinaId, aulas) {
    setTurmas((ts) =>
      ts.map((t) =>
        t.id !== turmaId
          ? t
          : { ...t, curriculo: t.curriculo.map((c) => (c.disciplinaId === disciplinaId ? { ...c, aulas } : c)) }
      )
    );
  }
  function removeCurriculoItem(turmaId, disciplinaId) {
    setTurmas((ts) =>
      ts.map((t) => (t.id !== turmaId ? t : { ...t, curriculo: t.curriculo.filter((c) => c.disciplinaId !== disciplinaId) }))
    );
  }

  function toggleDia(dia) {
    setDias((prev) => {
      if (prev.includes(dia)) return prev.filter((d) => d !== dia).sort((a, b) => DIAS_TODOS.indexOf(a) - DIAS_TODOS.indexOf(b));
      return [...prev, dia].sort((a, b) => DIAS_TODOS.indexOf(a) - DIAS_TODOS.indexOf(b));
    });
  }

  function toggleTurno(turno) {
    setTurnos((prev) => {
      if (prev.includes(turno)) {
        if (prev.length === 1) {
          avisar("erro", "É preciso manter pelo menos um turno ativo.");
          return prev;
        }
        return prev.filter((t) => t !== turno).sort((a, b) => TURNOS_TODOS.indexOf(a) - TURNOS_TODOS.indexOf(b));
      }
      return [...prev, turno].sort((a, b) => TURNOS_TODOS.indexOf(a) - TURNOS_TODOS.indexOf(b));
    });
  }

  function setPeriodosTurno(turno, valor) {
    setPeriodosPorTurno((prev) => ({ ...prev, [turno]: Math.max(1, Math.min(10, Number(valor) || 1)) }));
  }

  const capacidadeTotal = dias.length * turnos.reduce((s, t) => s + (periodosPorTurno[t] || 0), 0);

  // ---------- Geração automática ----------
  function gerarAutomaticamente() {
    if (turmas.length === 0) {
      avisar("erro", "Cadastre pelo menos uma turma antes de gerar o horário.");
      return;
    }
    for (const t of turmas) {
      const total = t.curriculo.reduce((s, c) => s + c.aulas, 0);
      if (total > capacidadeTotal) {
        avisar("erro", `A turma "${t.nome}" tem ${total} aulas planejadas, mas só há ${capacidadeTotal} horários na semana.`);
        return;
      }
    }

    // Pré-checagem de disponibilidade por professor
    const necessarias = {};
    turmas.forEach((t) => {
      t.curriculo.forEach((c) => {
        const prof = disciplinas.find((d) => d.id === c.disciplinaId)?.professorId;
        if (!prof) return;
        necessarias[prof] = (necessarias[prof] || 0) + c.aulas;
      });
    });
    for (const profId of Object.keys(necessarias)) {
      const prof = professores.find((p) => p.id === profId);
      if (!prof) continue;
      const diasDisponiveis = dias.filter((d) => !prof.diasIndisponiveis?.includes(d));
      const turnosDisponiveis = (prof.turnos?.length ? prof.turnos : turnos).filter((t) => turnos.includes(t));
      const disponivel = diasDisponiveis.length * turnosDisponiveis.reduce((s, t) => s + (periodosPorTurno[t] || 0), 0);
      if (necessarias[profId] > disponivel) {
        avisar("erro", `${prof.nome} precisaria de ${necessarias[profId]} aulas/semana, mas só está disponível para ${disponivel} horários com as restrições atuais.`);
        return;
      }
    }

    for (let tentativa = 0; tentativa < 150; tentativa++) {
      const nova = gradeVazia(turmas, dias, turnos, periodosPorTurno);
      const ocupProf = {}; // "dia|turno|periodo" -> Set(professorId)
      let ok = true;

      for (const turma of shuffle(turmas)) {
        const unidades = shuffle(
          turma.curriculo.flatMap((c) => Array(c.aulas).fill(c.disciplinaId))
        );
        const diasUsados = {}; // disciplinaId -> Set(dia)
        let slotsLivres = [];
        dias.forEach((d) => {
          turnos.forEach((tu) => {
            const n = periodosPorTurno[tu] || 0;
            for (let p = 1; p <= n; p++) slotsLivres.push([d, tu, p]);
          });
        });

        for (const disc of unidades) {
          const profId = disciplinas.find((d) => d.id === disc)?.professorId || "";
          const profObj = professores.find((p) => p.id === profId);
          const candidatos = shuffle(slotsLivres);
          let colocado = false;

          for (const preferirDiaNovo of [true, false]) {
            for (const [d, tu, p] of candidatos) {
              if (preferirDiaNovo && diasUsados[disc]?.has(d)) continue;
              if (!professorDisponivel(profObj, d, tu)) continue;
              const key = `${d}|${tu}|${p}`;
              if (profId && ocupProf[key]?.has(profId)) continue;

              nova[turma.id][d][tu][p] = disc;
              slotsLivres = slotsLivres.filter((s) => !(s[0] === d && s[1] === tu && s[2] === p));
              if (profId) {
                ocupProf[key] = ocupProf[key] || new Set();
                ocupProf[key].add(profId);
              }
              diasUsados[disc] = diasUsados[disc] || new Set();
              diasUsados[disc].add(d);
              colocado = true;
              break;
            }
            if (colocado) break;
          }
          if (!colocado) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
      }

      if (ok) {
        setSchedule(nova);
        if (!turmaAtiva && turmas[0]) setTurmaAtiva(turmas[0].id);
        avisar("sucesso", "Horário gerado sem conflitos de professor!");
        return;
      }
    }
    avisar("erro", "Não consegui montar um horário sem conflitos. Tente reduzir aulas por semana, liberar mais dias/turnos, ou revisar as restrições dos professores.");
  }

  function limparTurma(turmaId) {
    setSchedule((prev) => {
      const copia = { ...prev };
      const dia0 = {};
      dias.forEach((d) => {
        dia0[d] = {};
        turnos.forEach((tu) => {
          dia0[d][tu] = {};
          const n = periodosPorTurno[tu] || 0;
          for (let p = 1; p <= n; p++) dia0[d][tu][p] = null;
        });
      });
      copia[turmaId] = dia0;
      return copia;
    });
  }

  // ---------- Edição manual ----------
  function trySetCell(turmaId, dia, turno, periodo, novaDisc) {
    if (novaDisc) {
      const prof = professores.find((p) => p.id === disciplinas.find((d) => d.id === novaDisc)?.professorId);
      if (prof) {
        if (prof.diasIndisponiveis?.includes(dia)) {
          avisar("erro", `${prof.nome} não está disponível às ${dia}.`);
          return;
        }
        if (prof.turnos?.length && !prof.turnos.includes(turno)) {
          avisar("erro", `${prof.nome} não leciona no turno da ${turno}.`);
          return;
        }
        for (const t of turmas) {
          if (t.id === turmaId) continue;
          const atual = schedule[t.id]?.[dia]?.[turno]?.[periodo];
          if (!atual) continue;
          const prof2 = disciplinas.find((d) => d.id === atual)?.professorId;
          if (prof2 === prof.id) {
            avisar("erro", `Conflito: ${prof.nome} já está com a turma "${t.nome}" neste horário.`);
            return;
          }
        }
      }
    }
    setSchedule((prev) => ({
      ...prev,
      [turmaId]: {
        ...prev[turmaId],
        [dia]: {
          ...prev[turmaId]?.[dia],
          [turno]: { ...prev[turmaId]?.[dia]?.[turno], [periodo]: novaDisc || null },
        },
      },
    }));
  }

  const turmaAtual = turmas.find((t) => t.id === turmaAtiva) || null;

  function contagemAulas(turmaId, disciplinaId) {
    let n = 0;
    dias.forEach((d) => {
      turnos.forEach((tu) => {
        const total = periodosPorTurno[tu] || 0;
        for (let p = 1; p <= total; p++) {
          if (schedule[turmaId]?.[d]?.[tu]?.[p] === disciplinaId) n++;
        }
      });
    });
    return n;
  }

  const linhaPapel = {
    backgroundImage:
      "repeating-linear-gradient(transparent, transparent 27px, #C9D6E3 28px)",
    backgroundColor: "#FBF9F3",
  };

  const abas = [
    { id: "professores", nome: "Professores", cor: CORES[0] },
    { id: "disciplinas", nome: "Disciplinas", cor: CORES[1] },
    { id: "turmas", nome: "Turmas", cor: CORES[2] },
    { id: "grade", nome: "Grade", cor: CORES[3] },
    { id: "montagem", nome: "Montagem", cor: CORES[4] },
    { id: "geral", nome: "Horário Geral", cor: CORES[5] },
  ];

  function handleImprimir() {
    window.print();
  }

  function TabelaTurno({ turmaId, turno, editavel }) {
    const n = periodosPorTurno[turno] || 0;
    return (
      <table className="w-full text-xs border-separate" style={{ borderSpacing: editavel ? "4px" : "3px" }}>
        <thead>
          <tr>
            <th className="text-left w-14" style={{ color: "#8A8270" }}></th>
            {dias.map((d) => (
              <th key={d} className="font-medium pb-1" style={{ color: "#4A4536" }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, i) => i + 1).map((p) => (
            <tr key={p}>
              <td className="pr-2 whitespace-nowrap" style={{ color: "#8A8270" }}>{p}ª aula</td>
              {dias.map((d) => {
                const val = schedule[turmaId]?.[d]?.[turno]?.[p] || "";
                const disc = disciplinas.find((dd) => dd.id === val);
                const prof = professores.find((pp) => pp.id === disc?.professorId);
                const cor = val ? corDisciplina(disciplinas, val) : null;
                if (!editavel) {
                  return (
                    <td
                      key={d}
                      className="rounded-md px-1.5 py-1.5 text-center align-middle"
                      style={{ backgroundColor: cor ? `${cor}22` : "#FFFDF7", border: `1px solid ${cor || "#E6E0CC"}`, color: "#22303C" }}
                    >
                      {disc ? (
                        <>
                          <div className="font-medium">{disc.nome}</div>
                          {prof && <div style={{ color: "#8A8270" }}>{prof.nome}</div>}
                        </>
                      ) : (
                        <span style={{ color: "#C9BFA5" }}>—</span>
                      )}
                    </td>
                  );
                }
                const turmaObj = turmas.find((t) => t.id === turmaId);
                return (
                  <td key={d}>
                    <select
                      value={val}
                      onChange={(e) => trySetCell(turmaId, d, turno, p, e.target.value)}
                      className="w-full rounded-md border px-1.5 py-1.5 text-xs"
                      style={{ backgroundColor: cor ? `${cor}22` : "#FFFDF7", borderColor: cor || "#C9BFA5", color: "#22303C" }}
                    >
                      <option value="">—</option>
                      {turmaObj?.curriculo.map((c) => {
                        const dd = disciplinas.find((x) => x.id === c.disciplinaId);
                        return (
                          <option key={c.disciplinaId} value={c.disciplinaId}>
                            {dd?.nome}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} className="min-h-screen w-full flex justify-center py-8 px-3" >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          body { background: white !important; }
        }
      `}</style>
      <div className="w-full max-w-5xl">
        <div className="flex items-baseline justify-between gap-3 mb-1 px-2 no-print">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl" style={{ color: "#22303C" }}>Horário Escolar</h1>
            <span style={{ fontFamily: "system-ui, sans-serif", color: "#6B6355" }} className="text-sm">
              professores, disciplinas e turmas sem choque de horário
            </span>
          </div>
          <button
            onClick={limparDadosSalvos}
            style={{ fontFamily: "system-ui, sans-serif", color: "#8A8270" }}
            className="text-xs underline whitespace-nowrap"
          >
            apagar dados salvos
          </button>
        </div>

        {msg && (
          <div
            style={{
              fontFamily: "system-ui, sans-serif",
              backgroundColor: msg.tipo === "erro" ? "#FBEAEA" : "#EAF4EF",
              color: msg.tipo === "erro" ? "#7A2A22" : "#215C3E",
              border: `1px solid ${msg.tipo === "erro" ? "#E0AFA9" : "#A9D3BB"}`,
            }}
            className="mx-2 mb-3 rounded-md px-3 py-2 text-sm flex items-center gap-2 justify-between no-print"
          >
            <span className="flex items-center gap-2">
              {msg.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              {msg.texto}
            </span>
            <button onClick={() => setMsg(null)} className="opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tabs estilo fichário */}
        <div className="flex gap-1 px-2 no-print" style={{ fontFamily: "system-ui, sans-serif" }}>
          {abas.map((a) => {
            const ativa = aba === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className="px-4 py-2 text-sm font-medium rounded-t-md transition-colors"
                style={{
                  backgroundColor: ativa ? a.cor : "#EFEADC",
                  color: ativa ? "#FBF9F3" : "#5A5344",
                  borderBottom: ativa ? `3px solid ${a.cor}` : "3px solid transparent",
                }}
              >
                {a.nome}
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div
          style={{ ...linhaPapel, borderColor: "#DFD8C4" }}
          className="border rounded-b-md rounded-tr-md p-5 relative"
        >
          <div
            style={{ backgroundColor: "#D96B6B", opacity: 0.35 }}
            className="absolute top-0 bottom-0 w-px"
          />

          {aba === "professores" && (
            <div style={{ fontFamily: "system-ui, sans-serif" }} className="space-y-4 pl-3">
              <h2 style={{ fontFamily: "Georgia, serif", color: "#22303C" }} className="text-xl">Professores</h2>
              <div className="flex gap-2">
                <input
                  value={nomeProf}
                  onChange={(e) => setNomeProf(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addProfessor()}
                  placeholder="Nome do professor"
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "#C9BFA5", backgroundColor: "#FFFDF7" }}
                />
                <button
                  onClick={addProfessor}
                  className="px-3 py-2 rounded-md text-sm text-white flex items-center gap-1"
                  style={{ backgroundColor: CORES[0] }}
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>
              {professores.length === 0 ? (
                <p className="text-sm" style={{ color: "#8A8270" }}>Nenhum professor cadastrado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {professores.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-md px-3 py-2 text-sm"
                      style={{ backgroundColor: "#FFFDF7", border: "1px solid #E6E0CC" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.nome}</span>
                        <button onClick={() => removeProfessor(p.id)} className="opacity-50 hover:opacity-100" style={{ color: "#C0392B" }}>
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {turnos.length > 1 && (
                        <div className="mt-2">
                          <span className="text-xs" style={{ color: "#8A8270" }}>Leciona no turno: </span>
                          <div className="flex gap-1.5 flex-wrap mt-1">
                            {turnos.map((tu) => {
                              const marcado = p.turnos?.includes(tu);
                              return (
                                <button
                                  key={tu}
                                  onClick={() => toggleProfessorTurno(p.id, tu)}
                                  className="px-2 py-0.5 rounded-full text-xs border"
                                  style={{
                                    backgroundColor: marcado ? CORES[0] : "#FBF9F3",
                                    color: marcado ? "#FBF9F3" : "#4A4536",
                                    borderColor: marcado ? CORES[0] : "#C9BFA5",
                                  }}
                                >
                                  {tu}
                                </button>
                              );
                            })}
                          </div>
                          {!p.turnos?.length && (
                            <span className="text-xs" style={{ color: "#8A8270" }}>nenhum marcado = disponível em qualquer turno</span>
                          )}
                        </div>
                      )}

                      <div className="mt-2">
                        <span className="text-xs" style={{ color: "#8A8270" }}>Dias indisponíveis: </span>
                        <div className="flex gap-1.5 flex-wrap mt-1">
                          {dias.map((d) => {
                            const marcado = p.diasIndisponiveis?.includes(d);
                            return (
                              <button
                                key={d}
                                onClick={() => toggleProfessorDiaIndisponivel(p.id, d)}
                                className="px-2 py-0.5 rounded-full text-xs border"
                                style={{
                                  backgroundColor: marcado ? "#C0392B" : "#FBF9F3",
                                  color: marcado ? "#FBF9F3" : "#4A4536",
                                  borderColor: marcado ? "#C0392B" : "#C9BFA5",
                                }}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {aba === "disciplinas" && (
            <div style={{ fontFamily: "system-ui, sans-serif" }} className="space-y-4 pl-3">
              <h2 style={{ fontFamily: "Georgia, serif", color: "#22303C" }} className="text-xl">Disciplinas</h2>
              <div className="flex flex-wrap gap-2">
                <input
                  value={nomeDisc}
                  onChange={(e) => setNomeDisc(e.target.value)}
                  placeholder="Nome da disciplina"
                  className="flex-1 min-w-[160px] rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "#C9BFA5", backgroundColor: "#FFFDF7" }}
                />
                <select
                  value={profDisc}
                  onChange={(e) => setProfDisc(e.target.value)}
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "#C9BFA5", backgroundColor: "#FFFDF7" }}
                >
                  <option value="">Sem professor definido</option>
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                <button
                  onClick={addDisciplina}
                  className="px-3 py-2 rounded-md text-sm text-white flex items-center gap-1"
                  style={{ backgroundColor: CORES[1] }}
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>
              {professores.length === 0 && (
                <p className="text-xs" style={{ color: "#8A8270" }}>
                  Dica: cadastre os professores primeiro para já vincular cada disciplina a quem leciona.
                </p>
              )}
              {disciplinas.length === 0 ? (
                <p className="text-sm" style={{ color: "#8A8270" }}>Nenhuma disciplina cadastrada ainda.</p>
              ) : (
                <ul className="space-y-1.5">
                  {disciplinas.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm"
                      style={{ backgroundColor: "#FFFDF7", border: `1px solid ${corDisciplina(disciplinas, d.id)}55`, borderLeft: `4px solid ${corDisciplina(disciplinas, d.id)}` }}
                    >
                      <span>
                        {d.nome}{" "}
                        <span style={{ color: "#8A8270" }} className="text-xs">
                          — {professores.find((p) => p.id === d.professorId)?.nome || "sem professor"}
                        </span>
                      </span>
                      <button onClick={() => removeDisciplina(d.id)} className="opacity-50 hover:opacity-100" style={{ color: "#C0392B" }}>
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {aba === "turmas" && (
            <div style={{ fontFamily: "system-ui, sans-serif" }} className="space-y-4 pl-3">
              <h2 style={{ fontFamily: "Georgia, serif", color: "#22303C" }} className="text-xl">Turmas</h2>
              <div className="flex gap-2">
                <input
                  value={nomeTurma}
                  onChange={(e) => setNomeTurma(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTurma()}
                  placeholder="Nome da turma (ex: 3º Ano A)"
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "#C9BFA5", backgroundColor: "#FFFDF7" }}
                />
                <button
                  onClick={addTurma}
                  className="px-3 py-2 rounded-md text-sm text-white flex items-center gap-1"
                  style={{ backgroundColor: CORES[2] }}
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>

              {turmas.length === 0 ? (
                <p className="text-sm" style={{ color: "#8A8270" }}>Nenhuma turma cadastrada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {turmas.map((t) => (
                    <div key={t.id} className="rounded-md p-3" style={{ backgroundColor: "#FFFDF7", border: "1px solid #E6E0CC" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{t.nome}</span>
                        <button onClick={() => removeTurma(t.id)} className="opacity-50 hover:opacity-100" style={{ color: "#C0392B" }}>
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="flex gap-2 mb-2">
                        <select
                          onChange={(e) => {
                            addCurriculoItem(t.id, e.target.value);
                            e.target.value = "";
                          }}
                          className="rounded-md border px-2 py-1.5 text-sm flex-1"
                          style={{ borderColor: "#C9BFA5", backgroundColor: "#FBF9F3" }}
                          defaultValue=""
                        >
                          <option value="" disabled>+ adicionar disciplina ao currículo</option>
                          {disciplinas
                            .filter((d) => !t.curriculo.some((c) => c.disciplinaId === d.id))
                            .map((d) => (
                              <option key={d.id} value={d.id}>{d.nome}</option>
                            ))}
                        </select>
                      </div>

                      {t.curriculo.length === 0 ? (
                        <p className="text-xs" style={{ color: "#8A8270" }}>Sem disciplinas no currículo ainda.</p>
                      ) : (
                        <ul className="space-y-1">
                          {t.curriculo.map((c) => {
                            const disc = disciplinas.find((d) => d.id === c.disciplinaId);
                            return (
                              <li key={c.disciplinaId} className="flex items-center gap-2 text-sm">
                                <span
                                  className="inline-block w-2 h-2 rounded-full"
                                  style={{ backgroundColor: corDisciplina(disciplinas, c.disciplinaId) }}
                                />
                                <span className="flex-1">{disc?.nome || "(removida)"}</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={capacidadeTotal}
                                  value={c.aulas}
                                  onChange={(e) => setCurriculoAulas(t.id, c.disciplinaId, Math.max(1, Number(e.target.value) || 1))}
                                  className="w-16 rounded-md border px-2 py-1 text-sm"
                                  style={{ borderColor: "#C9BFA5" }}
                                />
                                <span style={{ color: "#8A8270" }} className="text-xs">aulas/semana</span>
                                <button onClick={() => removeCurriculoItem(t.id, c.disciplinaId)} className="opacity-40 hover:opacity-100" style={{ color: "#C0392B" }}>
                                  <X size={14} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {aba === "grade" && (
            <div style={{ fontFamily: "system-ui, sans-serif" }} className="space-y-5 pl-3">
              <h2 style={{ fontFamily: "Georgia, serif", color: "#22303C" }} className="text-xl">Grade da semana</h2>
              <div>
                <p className="text-sm mb-2" style={{ color: "#4A4536" }}>Dias com aula:</p>
                <div className="flex gap-2 flex-wrap">
                  {DIAS_TODOS.map((d) => {
                    const ativo = dias.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDia(d)}
                        className="px-3 py-1.5 rounded-md text-sm border"
                        style={{
                          backgroundColor: ativo ? CORES[3] : "#FFFDF7",
                          color: ativo ? "#FBF9F3" : "#4A4536",
                          borderColor: ativo ? CORES[3] : "#C9BFA5",
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm mb-2" style={{ color: "#4A4536" }}>Turnos utilizados pela escola:</p>
                <div className="flex gap-2 flex-wrap">
                  {TURNOS_TODOS.map((tu) => {
                    const ativo = turnos.includes(tu);
                    return (
                      <button
                        key={tu}
                        onClick={() => toggleTurno(tu)}
                        className="px-3 py-1.5 rounded-md text-sm border"
                        style={{
                          backgroundColor: ativo ? CORES[3] : "#FFFDF7",
                          color: ativo ? "#FBF9F3" : "#4A4536",
                          borderColor: ativo ? CORES[3] : "#C9BFA5",
                        }}
                      >
                        {tu}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs mt-1" style={{ color: "#8A8270" }}>
                  Uma turma pode ter aulas em mais de um turno (ex: técnico integrado). Cada professor pode ser restrito a um turno específico na aba "Professores".
                </p>
              </div>

              <div>
                <p className="text-sm mb-2" style={{ color: "#4A4536" }}>Aulas por dia, em cada turno:</p>
                <div className="flex gap-4 flex-wrap">
                  {turnos.map((tu) => (
                    <div key={tu} className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: "#4A4536" }}>{tu}:</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={periodosPorTurno[tu] || 1}
                        onChange={(e) => setPeriodosTurno(tu, e.target.value)}
                        className="w-20 rounded-md border px-3 py-2 text-sm"
                        style={{ borderColor: "#C9BFA5", backgroundColor: "#FFFDF7" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs" style={{ color: "#8A8270" }}>
                Capacidade total por turma: {capacidadeTotal} aulas/semana.
              </p>
            </div>
          )}

          {aba === "montagem" && (
            <div style={{ fontFamily: "system-ui, sans-serif" }} className="space-y-4 pl-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 style={{ fontFamily: "Georgia, serif", color: "#22303C" }} className="text-xl">Montagem do horário</h2>
                <button
                  onClick={gerarAutomaticamente}
                  className="px-3 py-2 rounded-md text-sm text-white flex items-center gap-1.5"
                  style={{ backgroundColor: CORES[4] }}
                >
                  <Shuffle size={15} /> Gerar automaticamente (todas as turmas)
                </button>
              </div>

              {turmas.length === 0 ? (
                <p className="text-sm" style={{ color: "#8A8270" }}>Cadastre turmas na aba "Turmas" para começar a montar o horário.</p>
              ) : (
                <>
                  <div className="flex gap-2 flex-wrap">
                    {turmas.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTurmaAtiva(t.id)}
                        className="px-3 py-1.5 rounded-full text-sm border"
                        style={{
                          backgroundColor: turmaAtiva === t.id ? "#22303C" : "#FFFDF7",
                          color: turmaAtiva === t.id ? "#FBF9F3" : "#4A4536",
                          borderColor: "#C9BFA5",
                        }}
                      >
                        {t.nome}
                      </button>
                    ))}
                  </div>

                  {turmaAtual && (
                    <div className="space-y-3">
                      {turmaAtual.curriculo.length === 0 ? (
                        <p className="text-sm" style={{ color: "#8A8270" }}>
                          Essa turma ainda não tem disciplinas no currículo. Adicione na aba "Turmas".
                        </p>
                      ) : (
                        <>
                          <div className="space-y-5">
                            {turnos.map((tu) => (
                              <div key={tu}>
                                {turnos.length > 1 && (
                                  <p className="text-xs font-medium mb-1.5" style={{ color: "#4A4536" }}>Turno: {tu}</p>
                                )}
                                <div className="overflow-x-auto">
                                  <TabelaTurno turmaId={turmaAtual.id} turno={tu} editavel />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                            <div className="flex gap-2 flex-wrap">
                              {turmaAtual.curriculo.map((c) => {
                                const disc = disciplinas.find((d) => d.id === c.disciplinaId);
                                const feitas = contagemAulas(turmaAtual.id, c.disciplinaId);
                                const cor = feitas === c.aulas ? "#3F8361" : feitas > c.aulas ? "#C0392B" : "#B8860B";
                                return (
                                  <span
                                    key={c.disciplinaId}
                                    className="text-xs px-2 py-1 rounded-full"
                                    style={{ backgroundColor: `${cor}18`, color: cor, border: `1px solid ${cor}55` }}
                                  >
                                    {disc?.nome}: {feitas}/{c.aulas}
                                  </span>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => limparTurma(turmaAtual.id)}
                              className="text-xs underline"
                              style={{ color: "#8A8270" }}
                            >
                              limpar horário desta turma
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {aba === "geral" && (
            <div style={{ fontFamily: "system-ui, sans-serif" }} className="space-y-5 pl-3 print-area">
              <div className="flex items-center justify-between flex-wrap gap-2 no-print">
                <h2 style={{ fontFamily: "Georgia, serif", color: "#22303C" }} className="text-xl">
                  Horário Geral — todas as turmas
                </h2>
                <button
                  onClick={handleImprimir}
                  className="px-3 py-2 rounded-md text-sm text-white flex items-center gap-1.5"
                  style={{ backgroundColor: CORES[5] }}
                >
                  <Download size={15} /> Baixar em PDF
                </button>
              </div>
              <p className="text-xs no-print" style={{ color: "#8A8270" }}>
                O botão abre a janela de impressão do navegador — em "Destino", escolha "Salvar como PDF".
              </p>

              {turmas.length === 0 ? (
                <p className="text-sm" style={{ color: "#8A8270" }}>Cadastre turmas para ver o horário geral aqui.</p>
              ) : (
                <div className="space-y-8">
                  <h2 className="hidden print:block text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#22303C" }}>
                    Horário Geral — todas as turmas
                  </h2>
                  {turmas.map((t) => (
                    <div key={t.id} className="avoid-break">
                      <h3 className="text-base font-semibold mb-2" style={{ color: "#22303C" }}>{t.nome}</h3>
                      {t.curriculo.length === 0 ? (
                        <p className="text-xs" style={{ color: "#8A8270" }}>Sem currículo definido.</p>
                      ) : (
                        <div className="space-y-3">
                          {turnos.map((tu) => (
                            <div key={tu}>
                              {turnos.length > 1 && (
                                <p className="text-xs font-medium mb-1" style={{ color: "#4A4536" }}>Turno: {tu}</p>
                              )}
                              <TabelaTurno turmaId={t.id} turno={tu} editavel={false} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
