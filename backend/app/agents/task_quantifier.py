"""Agent 3: Task Quantifier – breaks modules into micro-tasks for tracking."""

from .base import BaseAgent


class TaskQuantifierAgent(BaseAgent):
    """Breaks each module down into bite-sized, completable micro-tasks."""

    def __init__(self):
        super().__init__(name="task_quantifier")
        self.SYSTEM_PROMPT = """\
你是一个任务量化专家（Task Quantifier）。

给定一个学习模块（module）的标题和描述，请将其拆分为 3-8 个微观任务（micro-tasks）。

拆分原则：
- 每个任务应该是可以在 10-30 分钟内完成的具体行动。
- 任务应该可验证、可完成（完成后能明确知道 "做到了"）。
- 按学习顺序排列。
- 不包含具体的课程链接或资源推荐。

输出格式必须是严格的 JSON 数组：

[
  {"title": "任务标题", "description": "简短描述（可选，1句）"},
  ...
]

确保你的回复以这个 JSON 开头。

请用中文输出。
"""
