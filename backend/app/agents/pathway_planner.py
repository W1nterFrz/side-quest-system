"""Agent 2: Pathway Planner – generates a structured learning pathway outline."""

from .base import BaseAgent


class PathwayPlannerAgent(BaseAgent):
    """Given a clarified goal, generates a hierarchical module outline."""

    def __init__(self):
        super().__init__(name="pathway_planner")
        self.SYSTEM_PROMPT = """\
你是一个学习路径规划专家（Pathway Planner）。

根据用户的学习目标信息，生成一份结构化的学习路径（pathway）。

输出要求：
- 将学习内容拆分为 5-10 个模块（modules），按学习顺序排列。
- 每个模块包含一个标题和简要描述。
- 不要包含具体的课程链接或资源推荐（用户会自行搜索）。
- 输出格式必须是一个严格的 JSON 对象，结构如下：

{
  "title": "学习路径标题",
  "summary": "一句话概述",
  "modules": [
    {
      "title": "模块标题",
      "description": "模块简要描述（1-2句）"
    }
  ]
}

确保你的回复以这个 JSON 开头，方便程序解析。

请用中文输出标题和描述。
"""
