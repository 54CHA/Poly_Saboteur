import { useState, useMemo, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Search, FileUp, Brain, Database, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";

const Main = () => {
  const [answers, setAnswers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [localAnswers, setLocalAnswers] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(30);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchSubjects();
      const savedSubjectId = localStorage.getItem("selectedSubjectId");
      const savedAnswers = localStorage.getItem("answers");

      if (savedSubjectId && savedAnswers) {
        const parsedId = parseInt(savedSubjectId);
        if (!isNaN(parsedId)) {
          setSelectedSubject(parsedId);
          setAnswers(JSON.parse(savedAnswers));
          setDisplayLimit(30);
        } else {
          localStorage.removeItem("selectedSubjectId");
          localStorage.removeItem("answers");
        }
      }
    };

    loadInitialData();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, questions_count, file_name");

      if (error) throw error;
      const sortedSubjects = data.sort((a, b) => a.name.localeCompare(b.name));
      setSubjects(sortedSubjects);
    } catch (err) {
      toast.error("Ошибка", {
        description: "Не удалось загрузить список предметов",
      });
    }
  };

  const handleSubjectSelect = async (subjectId) => {
    const loadingToast = toast.loading("Загрузка ответов...");

    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("answers")
        .eq("id", subjectId)
        .single();

      if (error) throw error;

      setSelectedSubject(subjectId);
      setAnswers(data.answers);
      setDisplayLimit(30);
      localStorage.setItem("selectedSubjectId", subjectId.toString());
      localStorage.setItem("answers", JSON.stringify(data.answers));

      toast.dismiss(loadingToast);
      toast.success("Предмет загружен", {
        description: "Вопросы и ответы ус��ешно загружены",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error loading answers:", error);
      toast.dismiss(loadingToast);
      toast.error("Ошибка", {
        description: "Не удалось загрузить ответы",
        duration: 3000,
      });
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsedAnswers = JSON.parse(text);

      console.log("Parsed Answers:", parsedAnswers);

      if (
        Array.isArray(parsedAnswers) &&
        parsedAnswers.every((item) => item.question && item.answer)
      ) {
        setLocalAnswers(parsedAnswers);
        toast.success("Файл загружен", {
          description: "Ответы успешно загружены локально",
        });
      } else {
        throw new Error("Invalid JSON format");
      }
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error("Ошибка", {
        description: "Не удалось загрузить файл",
      });
    }
  };

  const filteredAnswers = useMemo(() => {
    if (!searchQuery.trim()) return answers.slice(0, displayLimit);

    const query = searchQuery.toLowerCase();
    return answers
      .filter(
        (item) =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)
      )
      .slice(0, displayLimit);
  }, [answers, searchQuery, displayLimit]);

  const handleSearch = (engine) => {
    if (!searchQuery.trim()) {
      toast.error("Ошибка", {
        description: "Введите текст для поиска",
        duration: 3000,
      });
      return;
    }

    const encodedQuery = searchQuery.replace(/\s+/g, "+");
    const searchUrls = {
      duckduckgo: `https://duckduckgo.com/?q=${encodedQuery}&t=ffab&ia=web`,
      google: `https://www.google.com/search?q=${encodedQuery}`,
      yandex: `https://yandex.ru/search/?text=${encodedQuery}`,
    };

    window.open(searchUrls[engine], "_blank");
  };

  const handleAiQuery = () => {
    window.open(
      `https://duckduckgo.com/?q=${searchQuery.replace(
        /\s+/g,
        "+"
      )}&t=ffab&ia=chat`,
      "_blank"
    );
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано", {
      description: "Текст скопирован в буфер обмена",
    });
  };

  const groupedSubjects = useMemo(() => {
    const groups = {};
    const nonRussianGroups = {};

    const russianPattern = /^[А-Яа-я]/;

    subjects.forEach((subject) => {
      const firstLetter = subject.name.charAt(0).toUpperCase();

      if (russianPattern.test(firstLetter)) {
        if (!groups[firstLetter]) {
          groups[firstLetter] = [];
        }
        groups[firstLetter].push(subject);
      } else {
        if (!nonRussianGroups[firstLetter]) {
          nonRussianGroups[firstLetter] = [];
        }
        nonRussianGroups[firstLetter].push(subject);
      }
    });

    return {
      ...groups,
      ...nonRussianGroups,
    };
  }, [subjects]);

  const handleResetSubject = () => {
    setSelectedSubject(null);
    setAnswers([]);
    setDisplayLimit(30);
    localStorage.removeItem("selectedSubjectId");
    localStorage.removeItem("answers");
    toast.success("Сброшено", {
      description: "Выбранный предмет был сброшен",
      duration: 3000,
    });
  };

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 30);
  };

  return (
    <main className="max-w-[1200px] mx-auto p-4 sm:p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Mobile Dropdown */}
        <div className="md:hidden w-full">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full gap-2 justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <Database className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {subjects.find((s) => s.id === selectedSubject)?.name ||
                      "Выберите предмет"}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[var(--radix-dropdown-trigger-width)] max-h-[60vh] overflow-y-auto"
            >
              {selectedSubject && (
                <>
                  <DropdownMenuItem onClick={handleResetSubject}>
                    Сбросить выбор
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {Object.entries(groupedSubjects).map(
                ([letter, letterSubjects]) => (
                  <div key={letter}>
                    <DropdownMenuItem
                      className="text-sm text-muted-foreground"
                      disabled
                    >
                      {letter}
                    </DropdownMenuItem>
                    {letterSubjects.map((subject) => (
                      <DropdownMenuItem
                        key={subject.id}
                        onClick={() => handleSubjectSelect(subject.id)}
                        className="pl-6"
                      >
                        <div className="flex flex-col w-full py-1">
                          <div className="truncate">{subject.name}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 shrink-0 space-y-4 sticky top-4 h-[calc(100vh-8rem)]">
          <div className="rounded-lg border bg-card p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Предметы</h3>
              {selectedSubject && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSubject}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  Сбросить
                </Button>
              )}
            </div>
            <div
              className="space-y-4 overflow-y-auto pr-2"
              style={{ height: "calc(100% - 2rem)" }}
            >
              {Object.entries(groupedSubjects).map(
                ([letter, letterSubjects]) => (
                  <div key={letter} className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground px-3 sticky top-0 bg-card z-10">
                      {letter}
                    </div>
                    {letterSubjects.map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => handleSubjectSelect(subject.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                          "hover:bg-muted/50",
                          selectedSubject === subject.id &&
                            "bg-muted font-medium"
                        )}
                      >
                        <div className="truncate">{subject.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {subject.questions_count} вопросов
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Поиск ответов
                </h2>
                <p className="text-sm text-muted-foreground">
                  Выберите предмет из базы данных или загрузите новый JSON файл
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-[60%]">
                  <Input
                    type="text"
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 md:flex gap-2 w-full md:w-auto">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="default"
                        className="gap-2 w-full md:w-auto"
                      >
                        <Search className="h-4 w-4" />
                        Поиск
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      sideOffset={5}
                      className="w-[var(--radix-dropdown-trigger-width)]"
                    >
                      <DropdownMenuItem
                        onClick={() => handleSearch("duckduckgo")}
                      >
                        DuckDuckGo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSearch("google")}>
                        Google
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSearch("yandex")}>
                        Яндекс
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="default"
                    onClick={handleAiQuery}
                    className="gap-2 w-full md:w-auto"
                  >
                    <Brain className="h-4 w-4" />
                    ИИ
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    accept=".json"
                    onChange={handleFileUpload}
                    id="file-input"
                  />
                  <Button
                    variant="default"
                    onClick={() =>
                      document.getElementById("file-input").click()
                    }
                    className="gap-2 w-full md:w-auto col-span-2 md:col-span-1"
                  >
                    <FileUp className="h-4 w-4" />
                    Загрузить
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {(localAnswers.length > 0 ? localAnswers : answers).length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                {/* Mobile View */}
                <div className="grid grid-cols-1 divide-y md:hidden">
                  {(localAnswers.length > 0
                    ? localAnswers
                    : filteredAnswers
                  ).map((item, index) => (
                    <div key={index} className="p-4 space-y-2">
                      <div
                        onClick={() => copyToClipboard(item.question)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors rounded p-2"
                      >
                        <div className="text-sm text-muted-foreground mb-1">
                          Вопрос:
                        </div>
                        <div className="text-sm">{item.question}</div>
                      </div>
                      <div
                        onClick={() => copyToClipboard(item.answer)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors rounded p-2"
                      >
                        <div className="text-sm text-muted-foreground mb-1">
                          Ответ:
                        </div>
                        <div className="text-sm">{item.answer}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Вопрос</TableHead>
                        <TableHead>Ответ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(localAnswers.length > 0
                        ? localAnswers
                        : filteredAnswers
                      ).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell
                            onClick={() => copyToClipboard(item.question)}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            {item.question}
                          </TableCell>
                          <TableCell
                            onClick={() => copyToClipboard(item.answer)}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            {item.answer}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Add Load More button */}
              {!localAnswers.length && answers.length > displayLimit && (
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  className="w-full"
                >
                  Загрузить еще
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-12">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Выберите предмет</h3>
                <p className="text-sm text-muted-foreground">
                  Выберите предмет из списка или загрузите новый JSON файл с
                  вопросами
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Main;
