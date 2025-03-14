import { postData } from "@/lib/fetch-utils";
import {
  InfiniteData,
  QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Comment } from "../api/comments/data";
import { CommentsResponse } from "../api/comments/route";

const queryKey: QueryKey = ["comments"];

export function useCreateCommentMutationOptimistic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newComment: { text: string }) =>
      postData<{ comment: Comment }>("/api/comments", newComment),
    onMutate: async (newCommentData) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData =
        queryClient.getQueryData<
          InfiniteData<CommentsResponse, number | undefined>
        >(queryKey);

      const optimisticComment: Comment = {
        id: Date.now(),
        text: newCommentData.text,
        user: {
          name: "Current User",
          avatar: "CU",
        },
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<
        InfiniteData<CommentsResponse, number | undefined>
      >(queryKey, (oldData) => {
        const firstPage = oldData?.pages[0];

        if (firstPage) {
          return {
            ...oldData,
            pages: [
              {
                ...firstPage,
                totalComments: firstPage.totalComments + 1,
                comments: [optimisticComment, ...firstPage.comments],
              },
              ...oldData.pages.slice(1),
            ],
          };
        }
      });

      return { previousData };
    },

    onError(error, variables, context) {
      queryClient.setQueryData(queryKey, context?.previousData);
    },
  });
}
